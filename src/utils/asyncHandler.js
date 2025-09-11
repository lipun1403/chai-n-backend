// asyncHandler.js

/**
    * A utility to handle errors in async route handlers.
    * 
    * Why we need this:
    * - In Express, if an async route throws an error or rejects a promise,
    *   it won't automatically be caught by Express.
    * - Normally you'd need try...catch in every async route.
    * - asyncHandler wraps your route and ensures any errors are passed to `next()`
    *   so Express's error handling middleware can catch them.
**/

const asyncHandler = (requestHandler) => {
  // Return a new middleware function
    return (req, res, next) => {
    // Ensure requestHandler runs as a Promise
    // If it throws or rejects, forward the error to Express using next()
        Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err));
    };
};

export {asyncHandler};
