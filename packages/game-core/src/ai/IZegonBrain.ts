import { ZegonDecision, RoundContext } from "../types/index.js";

export interface IZegonBrain {
  decide(ctx: RoundContext): Promise<ZegonDecision>;
}
