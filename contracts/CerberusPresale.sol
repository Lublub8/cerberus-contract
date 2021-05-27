// SPDX-License-Identifier: MIT

pragma solidity >=0.6.2;

library SafeMath {
    function mul(uint256 a, uint256 b) internal pure returns (uint256) {
        uint256 c = a * b;
        assert(a == 0 || c / a == b);
        return c;
    }

    function div(uint256 a, uint256 b) internal pure returns (uint256) {
        assert(b > 0);
        // Solidity automatically throws when dividing by 0
        uint256 c = a / b;
        assert(a == b * c + a % b);
        // There is no case in which this doesn't hold
        return c;
    }

    function sub(uint256 a, uint256 b) internal pure returns (uint256) {
        assert(b <= a);
        return a - b;
    }

    function add(uint256 a, uint256 b) internal pure returns (uint256) {
        uint256 c = a + b;
        assert(c >= a);
        return c;
    }
}

contract Ownable {
    address payable owner;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    constructor() public {
        owner = payable(msg.sender);
    }

    modifier onlyOwner() {
        require(msg.sender == owner);
        _;
    }

    function transferOwnership(address payable newOwner) onlyOwner public {
        require(newOwner != address(0));
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

}

contract Whitelisted is Ownable {
    mapping(address => uint8) public whitelist;
    mapping(address => bool) public provider;

    // Only whitelisted
    modifier onlyWhitelisted {
        require(isWhitelisted(msg.sender));
        _;
    }

    modifier onlyProvider {
        require(isProvider(msg.sender));
        _;
    }

    function isProvider(address _provider) public view returns (bool){
        return provider[_provider] == true ? true : false;
    }
    // Set new provider
    function setProvider(address _provider) public onlyOwner {
        provider[_provider] = true;
    }
    // Deactivate current provider
    function deactivateProvider(address _provider) public onlyOwner {
        require(provider[_provider] == true);
        provider[_provider] = false;
    }
    // Set purchaser to whitelist with zone code
    function joinWhitelist(address _purchaser, uint8 _zone) public {
        whitelist[_purchaser] = _zone;
    }
    // Delete purchaser from whitelist
    function deleteFromWhitelist(address _purchaser) public onlyOwner {
        whitelist[_purchaser] = 0;
    }
    // Get purchaser zone code
    function getWhitelistedZone(address _purchaser) public view returns (uint8) {
        return whitelist[_purchaser] > 0 ? whitelist[_purchaser] : 0;
    }
    // Check if purchaser is whitelisted : return true or false
    function isWhitelisted(address _purchaser) public view returns (bool){
        return whitelist[_purchaser] > 0;
    }
}

interface CerberusToken {
    function transfer(address recipient, uint256 amount) external returns (bool);

    function balanceOf(address _owner) external returns (uint256 balance);

    function mint(address wallet, address buyer, uint256 tokenAmount) external;

    function showMyTokenBalance(address addr) external;
}

contract CerberusPresale is Ownable, Whitelisted {
    using SafeMath for uint256;

    uint256 public startTime;
    uint256 public endTime;

    mapping(address => uint256) public ownerAddresses;
    mapping(address => uint256) public BuyerList;
    address public _burnaddress = 0x000000000000000000000000000000000000dEaD;
    address payable[] owners;

    uint256 public MAX_BUY_LIMIT = 20000000000000000001;
    uint256 public majorOwnerShares = 100;
    uint public    referralReward = 5;
    uint256 public coinPercentage = 40;
    uint256 public rate = 30e3;
    uint256 public weiRaised;

    bool public isPresaleStopped = false;
    bool public isPresalePaused = false;

    event TokenPurchase(address indexed purchaser, address indexed beneficiary, uint256 value, uint256 amount);
    event Transfered(address indexed purchaser, address indexed referral, uint256 amount);

    CerberusToken public token;

    constructor(
        address payable _walletMajorOwner,
        CerberusToken _cerberus,
        uint256 _startTime,
        uint256 _endTime
    ) public {
        token = _cerberus;
        startTime = _startTime;
        endTime = _endTime;

        require(endTime >= startTime);
        require(_walletMajorOwner != address(0));

        ownerAddresses[_walletMajorOwner] = majorOwnerShares;
        owners.push(_walletMajorOwner);
        owner = _walletMajorOwner;
    }

    fallback() external payable {
        buy(msg.sender, owner);
    }

    receive() external payable {}

    function isContract(address _addr) public view returns (bool _isContract){
        uint32 size;
        assembly {size := extcodesize(_addr)}
        return (size > 0);
    }

    //Buy tokens
    function buy(address beneficiary, address payable referral) public onlyWhitelisted payable {
        require(isPresaleStopped != true, 'Presale is stopped');
        require(isPresalePaused != true, 'Presale is paused');
        require(beneficiary != address(0), 'User asking for tokens sent to be on 0 address');
        require(validPurchase(), 'Its not a valid purchase');
        require(BuyerList[msg.sender] < MAX_BUY_LIMIT, 'MAX_BUY_LIMIT Achieved already for this wallet');
        uint256 weiAmount = msg.value;
        require(weiAmount < MAX_BUY_LIMIT, 'MAX_BUY_LIMIT is 20 BNB');
        uint256 tokens = weiAmount.mul(rate);

        uint256 weiMinusFee = msg.value - (msg.value * referralReward / 100);
        uint256 refReward = msg.value * referralReward / 100;

        weiRaised = weiRaised.add(weiAmount);
        splitFunds(referral, refReward);

        token.transfer(beneficiary, tokens);
        uint partnerCoins = tokens.mul(coinPercentage);
        partnerCoins = partnerCoins.div(100);

        BuyerList[msg.sender] = BuyerList[msg.sender].add(msg.value);

        emit TokenPurchase(msg.sender, beneficiary, weiAmount, tokens);

        forwardFunds(partnerCoins, weiMinusFee);
    }

    function splitFunds(address payable _b, uint256 amount) internal {
        _b.transfer(amount);
        emit Transfered(msg.sender, _b, amount);
    }

    function forwardFunds(uint256 partnerTokenAmount, uint256 weiMinusFee) internal {
        for (uint i = 0; i < owners.length; i++) {
            uint percent = ownerAddresses[owners[i]];
            uint amountToBeSent = weiMinusFee.mul(percent);
            amountToBeSent = amountToBeSent.div(100);
            owners[i].transfer(amountToBeSent);

            if (owners[i] != owner && ownerAddresses[owners[i]] > 0)
            {
                token.transfer(owners[i], partnerTokenAmount);
            }
        }
    }

    function addLiquidityPool(address payable partner) public onlyOwner {
        require(partner != address(0));
        require(ownerAddresses[owner] >= 48);
        require(ownerAddresses[partner] == 0);
        owners.push(partner);
        ownerAddresses[partner] = 48;
        uint majorOwnerShare = ownerAddresses[owner];
        ownerAddresses[owner] = majorOwnerShare.sub(48);
    }

    function validPurchase() internal returns (bool) {
        bool withinPeriod = block.timestamp >= startTime && block.timestamp <= endTime;
        bool nonZeroPurchase = msg.value != 0;
        return withinPeriod && nonZeroPurchase;
    }

    function hasEnded() public view returns (bool) {
        return block.timestamp > endTime;
    }

    function showMyTokenBalance(address myAddress) public returns (uint256 tokenBalance) {
        tokenBalance = token.balanceOf(myAddress);
    }

    function setEndDate(uint256 daysToEndFromToday) public onlyOwner returns (bool) {
        daysToEndFromToday = daysToEndFromToday * 1 days;
        endTime = block.timestamp + daysToEndFromToday;
        return true;
    }

    function setPriceRate(uint256 newPrice) public onlyOwner returns (bool) {
        rate = newPrice;
        return true;
    }

    function setReferralReward(uint256 newReward) public onlyOwner returns (bool) {
        referralReward = newReward;
        return true;
    }

    function pausePresale() public onlyOwner returns (bool) {
        isPresalePaused = true;
        return isPresalePaused;
    }

    function resumePresale() public onlyOwner returns (bool) {
        isPresalePaused = false;
        return !isPresalePaused;
    }

    function stopPresale() public onlyOwner returns (bool) {
        isPresaleStopped = true;
        return true;
    }

    function startPresale() public onlyOwner returns (bool) {
        isPresaleStopped = false;
        startTime = block.timestamp;
        return true;
    }

    function burnUnsoldTokens() public onlyOwner {
        uint256 unsold = token.balanceOf(address(this));
        token.transfer(_burnaddress, unsold);
    }

    // Recover lost bnb and send it to the contract owner
    function recoverLostBNB() public onlyOwner {
        address payable _owner = msg.sender;
        _owner.transfer(address(this).balance);
    }

    // Ensure requested tokens aren't users CERBERUS tokens
    function recoverLostTokensExceptOurTokens(address _token, uint256 amount) public onlyOwner {
        require(_token != address(this), "Cannot recover CERBERUS tokens");
        CerberusToken(_token).transfer(msg.sender, amount);
    }

    function tokensRemainingForSale() public returns (uint256 balance) {
        balance = token.balanceOf(address(this));
    }

    function checkOwnerShare(address owner) public view onlyOwner returns (uint) {
        uint share = ownerAddresses[owner];
        return share;
    }
}