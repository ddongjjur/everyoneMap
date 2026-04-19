"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { subscribePush } from "@/lib/pushNotification";

export default function PushInitializer() {
  useEffect(() => {
    const supabase = createClient();
    subscribePush(supabase);
  }, []);

  return null;
}
