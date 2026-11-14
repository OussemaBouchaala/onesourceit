import { query } from "./_generated/server";
import { getViewer } from "./lib";

/** The signed-in user's own profile (or null). */
export const me = query({
  args: {},
  handler: async (ctx) => {
    const viewer = await getViewer(ctx);
    if (!viewer.profile) return null;
    const p = viewer.profile;
    return {
      _id: p._id,
      role: p.role,
      isAdmin: viewer.isAdmin,
      isSuperAdmin: viewer.isSuperAdmin,
      status: p.status,
      refusalReason: p.refusalReason ?? null,
      shopName: p.shopName,
      fullName: p.fullName,
      email: p.email,
      phone: p.phone,
      governorate: p.governorate,
      city: p.city,
      address: p.address,
    };
  },
});
