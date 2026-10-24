use anchor_lang::error_code;

#[error_code]
// These errors indicate global permission failures.
pub enum PermissionError {
    #[msg("Operation denied: only administrators can perform this action.")]
    NotAdmin,
    #[msg("Insufficient permissions: this employee does not have the required permissions.")]
    PermissionDenied,
    #[msg("Insufficient department permissions.")]
    DepartmentDenied,
    #[msg("Insufficient role permissions.")]
    RoleDenied,
    #[msg("The administrator has globally disabled poll creation in PollConfig.")]
    GlobalPollDenied,
    #[msg("This employee is not active.")]
    EmployeeNotActive,
    #[msg("This employee's level does not meet the requirements for this action.")]
    LevelError,
}
#[error_code]
// These errors are used only to validate parameter correctness.
pub enum InvalidParameter {
    #[msg("Name is too long: the maximum length is 32 bytes.")]
    NameTooLong,
    #[msg("Too many parameters.")]
    TooManyParameters,
    #[msg("Too many parameters: a single transaction can process at most 20 Vec elements.")]
    TooManyVecItem,
    #[msg("Parameters cannot be empty or contain zero-length dynamic values.")]
    CanNotBeEmpty,
    #[msg("Invalid permission level: values must be between 0 and 31, and the minimum cannot exceed the maximum (if specified).")]
    LevelError,
    #[msg("Invalid or out-of-sync employee ID.")]
    EmployeeIDError,
    #[msg("This department does not exist.")]
    DepartmentNotFound,
    #[msg("This role does not exist.")]
    RoleNotFound,
    #[msg("This employee does not exist.")]
    EmployeeNotFound,
    #[msg("Multiple parameters expected to have the same address were found to differ. Check the client logic.")]
    AddressMismatchError,
    #[msg("Role change error: the old and new roles must differ.")]
    ChangeRoleError,
    #[msg("Invalid poll duration.")]
    IllegalPollIntervalTime,
    #[msg("String is too long: the maximum length is 64 bytes.")]
    StringTooLong,
    #[msg("The number of choices must be between 1 and 20.")]
    MultipleChoicesError,
    #[msg("Invalid timestamps: the start time cannot be after the end time or earlier than now.")]
    IllegalTimeStamp,
    #[msg("Poll duration cannot be shorter than min_polling_interval in PollConfig, configured by the administrator.")]
    TooShortInterval,
    #[msg("Poll duration cannot exceed max_polling_interval in PollConfig, configured by the administrator.")]
    TooLongInterval,
    #[msg("Invalid poll status update: only is_ready = Some(true) can transition Draft to Ready.")]
    PollStatusUpdateError,
    #[msg("Allowlist and blocklist conflict: the same item cannot appear in both lists.")]
    MutexVec,
    #[msg("Candidate not found.")]
    CandidateNotFound,
    #[msg("Invalid parameters: the two arguments must be equal.")]
    ShouldBeEqParameters,
    #[msg("Invalid parameters: the same candidate cannot be selected more than once.")]
    DuplicateChoicesError,
}
#[error_code]
// These errors indicate PDA issues, such as an account already existing or not existing.
pub enum PDAError {
    #[msg("Failed to create PDA: this PDA already exists.")]
    PDAExisted,
    #[msg("PDA operation failed: this PDA does not exist.")]
    PDANotExist,
}
#[error_code]
pub enum TxError {
    #[msg("Failed to create poll: this ID was claimed by another transaction.")]
    GETPollIDFailed,
    #[msg("Failed to vote: you have already voted in this poll.")]
    IsVoted,
    #[msg("Invalid poll state: participation and modification are not allowed.")]
    ErrorPoll,
    #[msg("This poll is marked as invalid (is_wrong_poll), but voting is still allowed.")]
    BadPoll,
    #[msg("The current time is outside the allowed period.")]
    TimeError,
    #[msg("This poll is closed; participation and modification are not allowed.")]
    ClosedPoll,
    #[msg("This poll is already ready and cannot be modified.")]
    ReadyPoll,
    // #[msg("This poll has not started.")]
    // VoteNotStarted,
    #[msg("This poll cannot be modified.")]
    VoteCanNotSet,
}
