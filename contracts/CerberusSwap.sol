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

interface CerberusPresaleToken {
    function transfer(address recipient, uint256 amount) external returns (bool);

    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);

    function balanceOf(address _owner) external returns (uint256 balance);
}

interface CerberusFarmingToken {
    function transfer(address recipient, uint256 amount) external returns (bool);

    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);

    function balanceOf(address _owner) external returns (uint256 balance);
}

contract CerberusSwap is Ownable {
    using SafeMath for uint256;

    event Swap(address indexed user, uint256 inAmount, uint256 outAmount);

    CerberusPresaleToken public token0;
    CerberusFarmingToken public token1;

    bool public isSwapStarted = false;

    //Will set to 910 when transferTaxRate = 9%
    uint256 public swapRate = 1000;

    //Will used to protect buyer when Farming Token set transferTaxRate > 0

    uint256 public MIN_SWAP_RATE = 910;

    uint256 public MAX_SWAP_RATE = 1000;

    constructor(
        address payable _owner,
        CerberusPresaleToken _presaleToken,
        CerberusFarmingToken _farmingToken
    ) public {
        token0 = _presaleToken;
        token1 = _farmingToken;
        owner = _owner;
    }

    function swap(uint256 inAmount) public {
        uint256 quota = token1.balanceOf(address(this));
        uint256 total = token0.balanceOf(msg.sender);
        uint256 outAmount = inAmount.mul(1000).div(swapRate);

        require(isSwapStarted == true, 'CerberusSwap::Swap not started');
        require(inAmount <= total, "CerberusSwap::Insufficient fund");
        require(outAmount <= quota, "CerberusSwap::Quota not enough");

        token0.transferFrom(msg.sender, address(this), inAmount);
        token1.transfer(msg.sender, outAmount);

        emit Swap(msg.sender, inAmount, outAmount);
    }

    function startSwap() public onlyOwner returns (bool) {
        isSwapStarted = true;
        return true;
    }

    function stopSwap() public onlyOwner returns (bool) {
        isSwapStarted = false;
        return true;
    }

    function setSwapRate(uint256 newRate) public onlyOwner returns (bool) {
        require(newRate <= MAX_SWAP_RATE, 'CerberusSwap::MAX_SWAP_RATE 1000');
        require(newRate >= MIN_SWAP_RATE, 'CerberusSwap::MIN_SWAP_RATE 910');

        swapRate = newRate;
        return true;
    }
}