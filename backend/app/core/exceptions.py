from fastapi import Request, status
from fastapi.responses import JSONResponse
from app.core.logging import logger
import traceback

async def global_exception_handler(request: Request, exc: Exception):
    error_id = getattr(exc, "error_id", "internal_error")
    
    # Log the full traceback internally
    logger.error(
        "unhandled_exception",
        path=request.url.path,
        method=request.method,
        exception=str(exc),
        traceback=traceback.format_exc()
    )
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "Internal Server Error",
            "message": "An unexpected error occurred. Please contact support.",
            "path": request.url.path
        }
    )
