import { BaseError, ContractFunctionRevertedError, UserRejectedRequestError } from "viem";

const FRIENDLY: Record<string, string> = {
  NoOneCanWithdraw: "Reverted with NoOneCanWithdraw(): there is no key that can take the pot.",
  CircleFull: "This circle is already full.",
  JoinClosed: "The join deadline has passed.",
  AlreadyMember: "You've already joined this circle.",
  NotMember: "Only members of this circle can do that.",
  AlreadyPaid: "You've already paid this round.",
  RoundOverdue: "The grace period is over. Anyone can now settle the round from the deposit.",
  NothingToSettle: "This round isn't ready to settle yet.",
  BadSecret: "That secret doesn't match the organiser's commitment.",
  RevealTooEarly: "Wait one more block before revealing.",
  RevealExpired: "Too late to reveal; use the fallback draw after the timeout.",
  FallbackTooEarly: "The organiser still has time to reveal.",
  InsufficientBalance: "Not enough tokens in this wallet.",
  InsufficientAllowance: "The token approval is missing.",
  FaucetCooldown: "The faucet gives 100 tUSDC once every 24 hours per address.",
  InvalidRounds: "That number of rounds isn't allowed.",
  WrongState: "The circle isn't in the right stage for that.",
};

export function errorName(err: unknown): string | undefined {
  if (err instanceof BaseError) {
    const revert = err.walk((e) => e instanceof ContractFunctionRevertedError);
    if (revert instanceof ContractFunctionRevertedError) return revert.data?.errorName;
  }
  return undefined;
}

export function friendlyError(err: unknown): string {
  if (err instanceof BaseError) {
    if (err.walk((e) => e instanceof UserRejectedRequestError)) return "You cancelled the request.";
    const name = errorName(err);
    if (name && FRIENDLY[name]) return FRIENDLY[name];
    if (name) return `Reverted: ${name}()`;
    const msg = err.shortMessage || err.message;
    if (/insufficient funds|exceeds balance|gas required exceeds/i.test(msg))
      return "Not enough test ETH for gas. Use the faucet link to top up.";
    if (/rejected|denied|cancel/i.test(msg)) return "You cancelled the request.";
    return msg.split("\n")[0];
  }
  if (err instanceof Error) return err.message.split("\n")[0];
  return "Something went wrong.";
}
