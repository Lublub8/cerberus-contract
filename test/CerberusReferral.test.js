const { expectRevert } = require('@openzeppelin/test-helpers');
const { assert } = require("chai");

const CerberusReferral = artifacts.require('CerberusReferral');

contract('CerberusReferral', ([alice, bob, carol, referrer, operator, owner]) => {
    beforeEach(async () => {
        this.cerberusReferral = await CerberusReferral.new({ from: owner });
        this.zeroAddress = '0x0000000000000000000000000000000000000000';
    });

    it('should allow operator and only owner to update operator', async () => {
        assert.equal((await this.cerberusReferral.operators(operator)).valueOf(), false);
        await expectRevert(this.cerberusReferral.recordReferral(alice, referrer, { from: operator }), 'Operator: caller is not the operator');

        await expectRevert(this.cerberusReferral.updateOperator(operator, true, { from: carol }), 'Ownable: caller is not the owner');
        await this.cerberusReferral.updateOperator(operator, true, { from: owner });
        assert.equal((await this.cerberusReferral.operators(operator)).valueOf(), true);

        await this.cerberusReferral.updateOperator(operator, false, { from: owner });
        assert.equal((await this.cerberusReferral.operators(operator)).valueOf(), false);
        await expectRevert(this.cerberusReferral.recordReferral(alice, referrer, { from: operator }), 'Operator: caller is not the operator');
    });

    it('record referral', async () => {
        assert.equal((await this.cerberusReferral.operators(operator)).valueOf(), false);
        await this.cerberusReferral.updateOperator(operator, true, { from: owner });
        assert.equal((await this.cerberusReferral.operators(operator)).valueOf(), true);

        await this.cerberusReferral.recordReferral(this.zeroAddress, referrer, { from: operator });
        await this.cerberusReferral.recordReferral(alice, this.zeroAddress, { from: operator });
        await this.cerberusReferral.recordReferral(this.zeroAddress, this.zeroAddress, { from: operator });
        await this.cerberusReferral.recordReferral(alice, alice, { from: operator });
        assert.equal((await this.cerberusReferral.getReferrer(alice)).valueOf(), this.zeroAddress);
        assert.equal((await this.cerberusReferral.referralsCount(referrer)).valueOf(), '0');

        await this.cerberusReferral.recordReferral(alice, referrer, { from: operator });
        assert.equal((await this.cerberusReferral.getReferrer(alice)).valueOf(), referrer);
        assert.equal((await this.cerberusReferral.referralsCount(referrer)).valueOf(), '1');

        assert.equal((await this.cerberusReferral.referralsCount(bob)).valueOf(), '0');
        await this.cerberusReferral.recordReferral(alice, bob, { from: operator });
        assert.equal((await this.cerberusReferral.referralsCount(bob)).valueOf(), '0');
        assert.equal((await this.cerberusReferral.getReferrer(alice)).valueOf(), referrer);

        await this.cerberusReferral.recordReferral(carol, referrer, { from: operator });
        assert.equal((await this.cerberusReferral.getReferrer(carol)).valueOf(), referrer);
        assert.equal((await this.cerberusReferral.referralsCount(referrer)).valueOf(), '2');
    });

    it('record referral commission', async () => {
        assert.equal((await this.cerberusReferral.totalReferralCommissions(referrer)).valueOf(), '0');

        await expectRevert(this.cerberusReferral.recordReferralCommission(referrer, 1, { from: operator }), 'Operator: caller is not the operator');
        await this.cerberusReferral.updateOperator(operator, true, { from: owner });
        assert.equal((await this.cerberusReferral.operators(operator)).valueOf(), true);

        await this.cerberusReferral.recordReferralCommission(referrer, 1, { from: operator });
        assert.equal((await this.cerberusReferral.totalReferralCommissions(referrer)).valueOf(), '1');

        await this.cerberusReferral.recordReferralCommission(referrer, 0, { from: operator });
        assert.equal((await this.cerberusReferral.totalReferralCommissions(referrer)).valueOf(), '1');

        await this.cerberusReferral.recordReferralCommission(referrer, 111, { from: operator });
        assert.equal((await this.cerberusReferral.totalReferralCommissions(referrer)).valueOf(), '112');

        await this.cerberusReferral.recordReferralCommission(this.zeroAddress, 100, { from: operator });
        assert.equal((await this.cerberusReferral.totalReferralCommissions(this.zeroAddress)).valueOf(), '0');
    });
});
