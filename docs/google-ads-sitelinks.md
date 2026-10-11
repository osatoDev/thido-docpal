# Google Ads sitelink plan

Prepared 30 September 2026. No website routes or Google Ads assets were changed.

Six useful sitelinks are a sensible next step. Google includes sitelink sufficiency in responsive search Ad Strength, but six links alone do not guarantee an Excellent rating or more conversions. [Google Ad Strength guidance](https://support.google.com/google-ads/answer/9921843?hl=en-GB).

## Suggested assets

All titles fit 25 characters; both description lines fit 35 characters each, including spaces and punctuation. [Google asset field limits](https://developers.google.com/google-ads/api/reference/rpc/v22/SitelinkAsset).

**The first five destinations are proposed pages and must be built and deployed before use in ads.** `/try` exists in the repository; its live behavior was not verified in this review.

| Sitelink text | Description line 1 | Description line 2 | Final URL |
| --- | --- | --- | --- |
| Product Features | Draft, edit and refine with AI. | Export your work to Word or PDF. | `https://thido.ai/features` |
| Drafting for Founders | Turn rough notes into updates. | Refine your message for investors. | `https://thido.ai/for-founders` |
| Write Product Briefs | Shape meeting notes into a brief. | Edit and question each section. | `https://thido.ai/product-briefs` |
| How Thido Works | Start with notes or an idea. | Refine your document step by step. | `https://thido.ai/how-it-works` |
| Edit With AI | Ask for changes to a passage. | Keep the parts already working. | `https://thido.ai/ai-document-editing` |
| Try Thido | Give Thido a short writing brief. | Start shaping your first draft. | `https://thido.ai/try` |

## Landing-page requirements

- **Product Features:** Explain starting from notes or a draft, formatting, AI revisions, and Word/PDF export with a concrete editor example.
- **Drafting for Founders:** Show an illustrative investor update built from rough monthly notes and a clear drafting action.
- **Write Product Briefs:** Show scattered meeting notes becoming a structured brief, matching the product-manager scenario on the homepage.
- **How Thido Works:** Walk through starting, editing, and refining/sharing, using the existing three-step product explanation.
- **Edit With AI:** Demonstrate requesting a targeted passage change while preserving the rest of a document.

Grounding: `src/components/landing/MarketingLanding.tsx`, `src/lib/landingStories.ts`, `src/lib/howItWorks.ts`, and `src/app/try/page.tsx`. Label example documents as illustrations, not customer testimonials. Each page needs useful content specific to its visitor intent and a clear Try Thido action.

The homepage already contains features, use cases, and how-it-works sections. Changing fragments or tracking parameters would not create the varied landing pages requested here. The homepage also redirects signed-in users to a document; new public marketing pages should remain accessible regardless of sign-in state.

## Activation and measurement

Verify each deployed destination on mobile and desktop, including its content and drafting CTA. Use unique sitelink text and the same domain as the main ad, consistent with [Google's sitelink requirements](https://support.google.com/adspolicy/answer/1054210?hl=en).

Once the pages are ready, add the six assets with both description lines to the relevant campaign and review approval status and Ad Strength. Keep founder-specific assets scoped to relevant audiences. These campaign changes remain unapplied.

Complete the signup-conversion verification already tracked in the production checklist. Assess verified signups and cost per signup alongside click-through rate; an improved asset score alone does not establish business impact.
