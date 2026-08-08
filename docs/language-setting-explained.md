# What the Language setting in Thido means

The setting declares the writing language of the current document. In the
current implementation, choosing English (US), English (UK), German, French, or
Spanish does three things:

1. It saves the selected language with the document.
2. It sets the editor's HTML `lang` attribute, which gives browsers and
   assistive technology the document-language context.
3. When spelling suggestions are enabled, it gives the browser a language hint
   for its native spelling dictionary.

It does **not** translate the document, change Thido's interface language,
change the user's keyboard, invoke an AI writing service, or provide a Thido
grammar checker. Browser behavior can also vary depending on which dictionaries
are installed or enabled on the user's device.

## Comparison with Google Docs

The observation about the menu placement is correct. Google Docs does have a
per-document language control, but Google places it under **File → Language**,
not under **Tools**. Google reserves **Tools → Translate document** for creating
a translated copy. This placement is documented in [Google Docs Editors Help](https://support.google.com/docs/answer/187189?co=GENIE.Platform%3DDesktop&hl=en).

Thido currently puts the five ungrouped language choices under **Tools**, beside
document statistics and the spelling-suggestions toggle. That is functional,
but it does not match the Google Docs arrangement and the options do not explain
their effect.

## Recommendation

Move the control to **File → Language** and present it as one clearly labeled
language submenu or dialog. Keep **Enable/Disable spelling suggestions** under
**Tools**, where users expect writing-review controls.

The visible label should be **Document language**, with helper text such as:

> Sets the language used by browser spelling suggestions for this document. It
> does not translate the text.

This preserves the useful document metadata while making the purpose and menu
location predictable.
