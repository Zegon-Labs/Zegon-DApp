import { DummyZegonBrain, WeaponId } from "@zegon/game-core";
import { getOGComputeService } from "../src/services/ogCompute.js";

async function main() {
  const pk = process.env.SERVER_WALLET_PRIVATE_KEY;
  if (!pk) {
    throw new Error("SERVER_WALLET_PRIVATE_KEY required for compute smoke test");
  }

  process.env.USE_OG_COMPUTE = "true";

  const ctx = {
    roundIndex: 0,
    playerHistory: [],
    playerHp: 100,
    zegonHp: 100,
    weapon: WeaponId.REVOLVER,
    ammo: 6,
    blindsight: 0,
    isDeadeye: false,
  };

  console.log("0G Compute smoke test starting...");
  const start = Date.now();

  try {
    const og = getOGComputeService();
    const result = await og.infer(ctx);
    const elapsed = Date.now() - start;

    console.log("Inference OK in", elapsed, "ms");
    console.log("Decision:", result.decision);
    console.log("Attestation hash:", result.attestationHash);

    const dummy = await new DummyZegonBrain("smoke").decide(ctx);
    if (
      result.attestationHash === dummy.zegonMove &&
      result.decision.taunt === dummy.taunt
    ) {
      console.warn("Warning: response may be dummy fallback");
    }
  } catch (err) {
    console.error("Compute smoke test failed:", err);
    console.log("Falling back to dummy brain for local dev...");
    const dummy = await new DummyZegonBrain("smoke").decide(ctx);
    console.log("Dummy decision:", dummy);
    process.exit(1);
  }

  console.log("Compute smoke test passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
