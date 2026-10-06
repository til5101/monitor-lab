# Sign-in email templates

Paste into Supabase → Authentication → Emails → Templates, in **both** projects.

| Supabase template | Subject | File |
|---|---|---|
| Magic Link | Your Monitor Lab sign-in link | `magic-link.html` |
| Confirm signup | Confirm your Monitor Lab account | `confirm-signup.html` |

`{{ .ConfirmationURL }}` and `{{ .Email }}` are filled in by Supabase.
