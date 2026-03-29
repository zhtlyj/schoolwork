import { expect } from "chai";
import { ethers } from "hardhat";

describe("AcademicIntegrityAnchor", function () {
  it("任意账户可锚定预警与干预；重复锚定失败；可追加干预审计事件", async function () {
    const [, alice, bob] = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("AcademicIntegrityAnchor");
    const anchor = await Factory.deploy();
    await anchor.waitForDeployment();

    const wKey = ethers.keccak256(ethers.toUtf8Bytes("warning:doc1"));
    const wHash = ethers.keccak256(ethers.toUtf8Bytes("warning-payload-v1"));

    await expect(anchor.connect(alice).anchorWarning(wKey, wHash)).to.emit(anchor, "WarningAnchored");

    const rec = await anchor.warnings(wKey);
    expect(rec.exists).to.be.true;
    expect(rec.contentHash).to.equal(wHash);
    expect(rec.submitter).to.equal(alice.address);

    await expect(anchor.connect(bob).anchorWarning(wKey, wHash)).to.be.revertedWithCustomError(
      anchor,
      "AlreadyAnchored"
    );

    const iKey = ethers.keccak256(ethers.toUtf8Bytes("intervention:doc1"));
    const iHash = ethers.keccak256(ethers.toUtf8Bytes("intervention-payload-v1"));
    await expect(anchor.connect(bob).anchorIntervention(iKey, iHash)).to.emit(anchor, "InterventionAnchored");

    const step = ethers.keccak256(ethers.toUtf8Bytes("status:pending_review"));
    await expect(anchor.connect(alice).appendInterventionAudit(iKey, step)).to.emit(
      anchor,
      "InterventionAuditStep"
    );

    await expect(anchor.connect(alice).appendInterventionAudit(wKey, step)).to.be.revertedWithCustomError(
      anchor,
      "InterventionNotAnchored"
    );

    const cancelPayload = ethers.keccak256(ethers.toUtf8Bytes("cancel:r1"));
    await expect(anchor.connect(alice).logWarningCancellation(wKey, cancelPayload)).to.emit(
      anchor,
      "WarningCancellationLogged"
    );
  });
});
