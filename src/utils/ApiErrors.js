class ApiError extends Error {
    constructor(
        statusCode,
        message="Something went wrong",
        errors = [],
        statck = ""
    ) {
        super(message)      // initializes the parent class i.e. error
        this.statusCode = statusCode
        this.data = null
        this.message = message
        this.success = false
        this.errors = errors

        if(statck) {
            this.statck = statck
        }
        else {
            Error.captureStackTrace(this, this.constructor)
        }
    }
}

export { ApiError };