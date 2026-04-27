# exceptions.py (Loguru only)
from rest_framework.views import exception_handler
from rich.pretty import pprint


def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)

    if response is not None:
        # Get context information
        view = context.get("view")
        request = context.get("request")

        # Prepare log data
        log_data = {
            "view": view.__class__.__name__ if view else "Unknown",
            "method": request.method if request else "Unknown",
            "path": request.path if request else "Unknown",
            "user": str(request.user)
            if request and hasattr(request, "user")
            else "Anonymous",
            "status_code": response.status_code,
            "exception_type": type(exc).__name__,
            "response_data": response.data,
            "request_data": request.data
            if request and hasattr(request, "data")
            else {},
            "request_files": {
                key: {"name": file.name, "size": file.size, "type": file.content_type}
                for key, file in (
                    request.FILES.items()
                    if request and hasattr(request, "FILES")
                    else {}
                )
            },
        }

        # Log the error
        pprint("DRF Exception Details:")
        pprint(log_data)

    return response
