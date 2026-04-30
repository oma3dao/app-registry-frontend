## Risk Level

<!-- Choose one: low / medium / high / red-zone -->

**Risk:** low

## Summary

<!-- What does this PR do? Keep it brief. -->

## Testing Performed

<!-- What did you test? Manual steps, automated tests, etc. -->

## CI Status

<!-- Confirm CI is green before merging. -->

- [ ] All required checks pass

## Self-Merge

<!-- If you are merging this without a second reviewer, fill out this section. Otherwise delete it. -->

- [ ] This is a self-merge
- **Reason for emergency self-merge:**
  <!-- e.g., production outage fix, broken deploy pipeline, launch-blocking bug -->
- **Post-merge reviewer:** @<!-- tag someone to review after merge -->

---

### Self-Merge Policy Reference

**Allowed self-merge examples:**
- Production outage fix
- Broken deploy pipeline
- Launch-blocking bug
- Failed build blocking work
- Low-risk typo / config fix
- Dependency / security patch
- Docs correction blocking external users
- Test-only changes
- CI / workflow fixes

**Never self-merge (red-zone):**
- Smart contract logic
- Contract deployment
- Auth / signature verification
- Permission model changes
- Database migrations
- Production secrets
- GitHub Actions permission changes
- Deployment credentials
- Irreversible onchain changes
- Registry identity / trust logic
- Attestation validity logic

---

### Labels

Apply any that fit:
`self-merged` · `emergency` · `post-merge-review-needed` · `launch-blocker` · `low-risk` · `security` · `red-zone` · `contract-change`
