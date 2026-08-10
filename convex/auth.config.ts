// Convex injects CONVEX_SITE_URL for every deployment. It is the issuer for
// the JWTs served by convex/http.ts and therefore the only provider Convex
// needs to trust for application queries and mutations.
const authConfig = {
  providers: [
    {
      domain: process.env.CONVEX_SITE_URL,
      applicationID: "convex",
    },
  ],
};

export default authConfig;
