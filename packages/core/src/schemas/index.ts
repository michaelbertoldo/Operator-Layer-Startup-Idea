import { z } from "zod";

export const moneyAmountCentsSchema = z.number().int().nonnegative();

