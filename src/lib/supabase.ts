import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://awhafmlglnnjvhmgpseh.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_Y60L65ki9dmM0a7Qu2L4cw_vM-WhYj9";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
