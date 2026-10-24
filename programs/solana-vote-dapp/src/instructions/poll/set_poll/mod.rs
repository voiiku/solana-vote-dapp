pub mod set_allow_methods;
pub mod set_banned_methods;
pub mod set_candidates_methods;
pub mod set_poll_normal;
pub mod update_poll_status;
// Methods for creating and updating poll content.

// Allowlist and blocklist entries must be valid and mutually exclusive: an item cannot be on the allowlist before being added to the blocklist, or vice versa.
