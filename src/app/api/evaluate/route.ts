import { POST as evaluateAttemptHandler } from '../evaluate-attempt/route';

export async function POST(request: Request) {
  return evaluateAttemptHandler(request);
}
