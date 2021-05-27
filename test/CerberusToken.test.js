const { expectRevert } = require("@openzeppelin/test-helpers");
const { assert } = require("chai");

const CerberusToken = artifacts.require('CerberusToken');

contract('CerberusToken', ([alice, bob, carol, operator, owner]) => {
    beforeEach(async () => {
        this.cerberus = await CerberusToken.new({ from: owner });
        this.burnAddress = '0x000000000000000000000000000000000000dEaD';
        this.zeroAddress = '0x0000000000000000000000000000000000000000';
    });

    it('only operator', async () => {
        assert.equal((await this.cerberus.owner()), owner);
        assert.equal((await this.cerberus.operator()), owner);

        await expectRevert(this.cerberus.updateTransferTaxRate(500, { from: operator }), 'operator: caller is not the operator');
        await expectRevert(this.cerberus.updateBurnRate(20, { from: operator }), 'operator: caller is not the operator');
        await expectRevert(this.cerberus.updateMaxTransferAmountRate(100, { from: operator }), 'operator: caller is not the operator');
        await expectRevert(this.cerberus.updateSwapAndLiquifyEnabled(true, { from: operator }), 'operator: caller is not the operator');
        await expectRevert(this.cerberus.setExcludedFromAntiWhale(operator, { from: operator }), 'operator: caller is not the operator');
        await expectRevert(this.cerberus.updateCerberusSwapRouter(operator, { from: operator }), 'operator: caller is not the operator');
        await expectRevert(this.cerberus.updateMinAmountToLiquify(100, { from: operator }), 'operator: caller is not the operator');
        await expectRevert(this.cerberus.transferOperator(alice, { from: operator }), 'operator: caller is not the operator');
    });

    it('transfer operator', async () => {
        await expectRevert(this.cerberus.transferOperator(operator, { from: operator }), 'operator: caller is not the operator');
        await this.cerberus.transferOperator(operator, { from: owner });
        assert.equal((await this.cerberus.operator()), operator);

        await expectRevert(this.cerberus.transferOperator(this.zeroAddress, { from: operator }), 'CERBERUS::transferOperator: new operator is the zero address');
    });

    it('update transfer tax rate', async () => {
        await this.cerberus.transferOperator(operator, { from: owner });
        assert.equal((await this.cerberus.operator()), operator);

        assert.equal((await this.cerberus.transferTaxRate()).toString(), '500');
        assert.equal((await this.cerberus.burnRate()).toString(), '20');

        await this.cerberus.updateTransferTaxRate(0, { from: operator });
        assert.equal((await this.cerberus.transferTaxRate()).toString(), '0');
        await this.cerberus.updateTransferTaxRate(1000, { from: operator });
        assert.equal((await this.cerberus.transferTaxRate()).toString(), '1000');
        await expectRevert(this.cerberus.updateTransferTaxRate(1001, { from: operator }), 'CERBERUS::updateTransferTaxRate: Transfer tax rate must not exceed the maximum rate.');

        await this.cerberus.updateBurnRate(0, { from: operator });
        assert.equal((await this.cerberus.burnRate()).toString(), '0');
        await this.cerberus.updateBurnRate(100, { from: operator });
        assert.equal((await this.cerberus.burnRate()).toString(), '100');
        await expectRevert(this.cerberus.updateBurnRate(101, { from: operator }), 'CERBERUS::updateBurnRate: Burn rate must not exceed the maximum rate.');
    });

    it('transfer', async () => {
        await this.cerberus.transferOperator(operator, { from: owner });
        assert.equal((await this.cerberus.operator()), operator);

        await this.cerberus.mint(alice, 10000000, { from: owner }); // max transfer amount 25,000
        assert.equal((await this.cerberus.balanceOf(alice)).toString(), '10000000');
        assert.equal((await this.cerberus.balanceOf(this.burnAddress)).toString(), '0');
        assert.equal((await this.cerberus.balanceOf(this.cerberus.address)).toString(), '0');

        await this.cerberus.transfer(bob, 12345, { from: alice });
        assert.equal((await this.cerberus.balanceOf(alice)).toString(), '9987655');
        assert.equal((await this.cerberus.balanceOf(bob)).toString(), '11728');
        assert.equal((await this.cerberus.balanceOf(this.burnAddress)).toString(), '123');
        assert.equal((await this.cerberus.balanceOf(this.cerberus.address)).toString(), '494');

        await this.cerberus.approve(carol, 22345, { from: alice });
        await this.cerberus.transferFrom(alice, carol, 22345, { from: carol });
        assert.equal((await this.cerberus.balanceOf(alice)).toString(), '9965310');
        assert.equal((await this.cerberus.balanceOf(carol)).toString(), '21228');
        assert.equal((await this.cerberus.balanceOf(this.burnAddress)).toString(), '346');
        assert.equal((await this.cerberus.balanceOf(this.cerberus.address)).toString(), '1388');
    });

    it('transfer small amount', async () => {
        await this.cerberus.transferOperator(operator, { from: owner });
        assert.equal((await this.cerberus.operator()), operator);

        await this.cerberus.mint(alice, 10000000, { from: owner });
        assert.equal((await this.cerberus.balanceOf(alice)).toString(), '10000000');
        assert.equal((await this.cerberus.balanceOf(this.burnAddress)).toString(), '0');
        assert.equal((await this.cerberus.balanceOf(this.cerberus.address)).toString(), '0');

        await this.cerberus.transfer(bob, 19, { from: alice });
        assert.equal((await this.cerberus.balanceOf(alice)).toString(), '9999981');
        assert.equal((await this.cerberus.balanceOf(bob)).toString(), '19');
        assert.equal((await this.cerberus.balanceOf(this.burnAddress)).toString(), '0');
        assert.equal((await this.cerberus.balanceOf(this.cerberus.address)).toString(), '0');
    });

    it('transfer without transfer tax', async () => {
        await this.cerberus.transferOperator(operator, { from: owner });
        assert.equal((await this.cerberus.operator()), operator);

        assert.equal((await this.cerberus.transferTaxRate()).toString(), '500');
        assert.equal((await this.cerberus.burnRate()).toString(), '20');

        await this.cerberus.updateTransferTaxRate(0, { from: operator });
        assert.equal((await this.cerberus.transferTaxRate()).toString(), '0');

        await this.cerberus.mint(alice, 10000000, { from: owner });
        assert.equal((await this.cerberus.balanceOf(alice)).toString(), '10000000');
        assert.equal((await this.cerberus.balanceOf(this.burnAddress)).toString(), '0');
        assert.equal((await this.cerberus.balanceOf(this.cerberus.address)).toString(), '0');

        await this.cerberus.transfer(bob, 10000, { from: alice });
        assert.equal((await this.cerberus.balanceOf(alice)).toString(), '9990000');
        assert.equal((await this.cerberus.balanceOf(bob)).toString(), '10000');
        assert.equal((await this.cerberus.balanceOf(this.burnAddress)).toString(), '0');
        assert.equal((await this.cerberus.balanceOf(this.cerberus.address)).toString(), '0');
    });

    it('transfer without burn', async () => {
        await this.cerberus.transferOperator(operator, { from: owner });
        assert.equal((await this.cerberus.operator()), operator);

        assert.equal((await this.cerberus.transferTaxRate()).toString(), '500');
        assert.equal((await this.cerberus.burnRate()).toString(), '20');

        await this.cerberus.updateBurnRate(0, { from: operator });
        assert.equal((await this.cerberus.burnRate()).toString(), '0');

        await this.cerberus.mint(alice, 10000000, { from: owner });
        assert.equal((await this.cerberus.balanceOf(alice)).toString(), '10000000');
        assert.equal((await this.cerberus.balanceOf(this.burnAddress)).toString(), '0');
        assert.equal((await this.cerberus.balanceOf(this.cerberus.address)).toString(), '0');

        await this.cerberus.transfer(bob, 1234, { from: alice });
        assert.equal((await this.cerberus.balanceOf(alice)).toString(), '9998766');
        assert.equal((await this.cerberus.balanceOf(bob)).toString(), '1173');
        assert.equal((await this.cerberus.balanceOf(this.burnAddress)).toString(), '0');
        assert.equal((await this.cerberus.balanceOf(this.cerberus.address)).toString(), '61');
    });

    it('transfer all burn', async () => {
        await this.cerberus.transferOperator(operator, { from: owner });
        assert.equal((await this.cerberus.operator()), operator);

        assert.equal((await this.cerberus.transferTaxRate()).toString(), '500');
        assert.equal((await this.cerberus.burnRate()).toString(), '20');

        await this.cerberus.updateBurnRate(100, { from: operator });
        assert.equal((await this.cerberus.burnRate()).toString(), '100');

        await this.cerberus.mint(alice, 10000000, { from: owner });
        assert.equal((await this.cerberus.balanceOf(alice)).toString(), '10000000');
        assert.equal((await this.cerberus.balanceOf(this.burnAddress)).toString(), '0');
        assert.equal((await this.cerberus.balanceOf(this.cerberus.address)).toString(), '0');

        await this.cerberus.transfer(bob, 1234, { from: alice });
        assert.equal((await this.cerberus.balanceOf(alice)).toString(), '9998766');
        assert.equal((await this.cerberus.balanceOf(bob)).toString(), '1173');
        assert.equal((await this.cerberus.balanceOf(this.burnAddress)).toString(), '61');
        assert.equal((await this.cerberus.balanceOf(this.cerberus.address)).toString(), '0');
    });

    it('max transfer amount', async () => {
        assert.equal((await this.cerberus.maxTransferAmountRate()).toString(), '50');
        assert.equal((await this.cerberus.maxTransferAmount()).toString(), '0');

        await this.cerberus.mint(alice, 1000000, { from: owner });
        assert.equal((await this.cerberus.maxTransferAmount()).toString(), '5000');

        await this.cerberus.mint(alice, 1000, { from: owner });
        assert.equal((await this.cerberus.maxTransferAmount()).toString(), '5005');

        await this.cerberus.transferOperator(operator, { from: owner });
        assert.equal((await this.cerberus.operator()), operator);

        await this.cerberus.updateMaxTransferAmountRate(100, { from: operator }); // 1%
        assert.equal((await this.cerberus.maxTransferAmount()).toString(), '10010');
    });

    it('anti whale', async () => {
        await this.cerberus.transferOperator(operator, { from: owner });
        assert.equal((await this.cerberus.operator()), operator);

        assert.equal((await this.cerberus.isExcludedFromAntiWhale(operator)), false);
        await this.cerberus.setExcludedFromAntiWhale(operator, true, { from: operator });
        assert.equal((await this.cerberus.isExcludedFromAntiWhale(operator)), true);

        await this.cerberus.mint(alice, 10000, { from: owner });
        await this.cerberus.mint(bob, 10000, { from: owner });
        await this.cerberus.mint(carol, 10000, { from: owner });
        await this.cerberus.mint(operator, 10000, { from: owner });
        await this.cerberus.mint(owner, 10000, { from: owner });

        // total supply: 50,000, max transfer amount: 250
        assert.equal((await this.cerberus.maxTransferAmount()).toString(), '250');
        await expectRevert(this.cerberus.transfer(bob, 251, { from: alice }), 'CERBERUS::antiWhale: Transfer amount exceeds the maxTransferAmount');
        await this.cerberus.approve(carol, 251, { from: alice });
        await expectRevert(this.cerberus.transferFrom(alice, carol, 251, { from: carol }), 'CERBERUS::antiWhale: Transfer amount exceeds the maxTransferAmount');

        //
        await this.cerberus.transfer(bob, 250, { from: alice });
        await this.cerberus.transferFrom(alice, carol, 250, { from: carol });

        await this.cerberus.transfer(this.burnAddress, 251, { from: alice });
        await this.cerberus.transfer(operator, 251, { from: alice });
        await this.cerberus.transfer(owner, 251, { from: alice });
        await this.cerberus.transfer(this.cerberus.address, 251, { from: alice });

        await this.cerberus.transfer(alice, 251, { from: operator });
        await this.cerberus.transfer(alice, 251, { from: owner });
        await this.cerberus.transfer(owner, 251, { from: operator });
    });

    it('update SwapAndLiquifyEnabled', async () => {
        await expectRevert(this.cerberus.updateSwapAndLiquifyEnabled(true, { from: operator }), 'operator: caller is not the operator');
        assert.equal((await this.cerberus.swapAndLiquifyEnabled()), false);

        await this.cerberus.transferOperator(operator, { from: owner });
        assert.equal((await this.cerberus.operator()), operator);

        await this.cerberus.updateSwapAndLiquifyEnabled(true, { from: operator });
        assert.equal((await this.cerberus.swapAndLiquifyEnabled()), true);
    });

    it('update min amount to liquify', async () => {
        await expectRevert(this.cerberus.updateMinAmountToLiquify(100, { from: operator }), 'operator: caller is not the operator');
        assert.equal((await this.cerberus.minAmountToLiquify()).toString(), '500000000000000000000');

        await this.cerberus.transferOperator(operator, { from: owner });
        assert.equal((await this.cerberus.operator()), operator);

        await this.cerberus.updateMinAmountToLiquify(100, { from: operator });
        assert.equal((await this.cerberus.minAmountToLiquify()).toString(), '100');
    });
});
