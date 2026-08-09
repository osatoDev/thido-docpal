import "server-only";

import { cache } from "react";

import { auth } from "@/lib/auth";

export const getCurrentSession = cache(async () => auth());
