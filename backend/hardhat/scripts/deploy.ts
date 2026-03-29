import hre from "hardhat";

async function main() {
  const signers = await hre.ethers.getSigners();
  const deployer = signers[0];
  if (!deployer) {
    throw new Error(
      "未找到可签名账户（factory runner does not support sending transactions）。\n" +
        "请在 backend/hardhat 目录下创建 .env，参考 .env.example 设置：\n" +
        "  SEPOLIA_PRIVATE_KEY=0x你的私钥\n" +
        "然后从 backend/hardhat 执行：npm run deploy:sepolia"
    );
  }
  console.log("部署账户:", deployer.address);

  const Factory = await hre.ethers.getContractFactory("AcademicIntegrityAnchor", deployer);
  const anchor = await Factory.deploy();
  await anchor.waitForDeployment();

  const address = await anchor.getAddress();
  console.log("AcademicIntegrityAnchor 合约地址:", address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
