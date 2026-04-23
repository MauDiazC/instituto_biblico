FROM python:3.13-slim

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Set working directory
WORKDIR /app

# Copy dependency files
COPY pyproject.toml uv.lock ./

# Install dependencies using uv
# --frozen ensures we use the exact versions in uv.lock
RUN uv sync --frozen

# Copy the rest of the application
COPY . .

# Expose port
EXPOSE 8000

# Script to run migrations and start server
# Using absolute path for alembic and uvicorn if needed, but uv run should handle it
CMD ["uv", "run", "bash", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
