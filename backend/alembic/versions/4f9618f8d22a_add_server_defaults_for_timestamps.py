"""Add server defaults for timestamps

Revision ID: 4f9618f8d22a
Revises: a91feb4ca70e
Create Date: 2026-04-21 11:01:40.530868

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4f9618f8d22a'
down_revision: Union[str, Sequence[str], None] = 'a91feb4ca70e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Set server defaults for tables that HAVE TimestampMixin
    tables = ['materias', 'bloques', 'clases', 'tareas', 'enrollments']
    for table in tables:
        op.execute(f"ALTER TABLE {table} ALTER COLUMN created_at SET DEFAULT now()")
        op.execute(f"ALTER TABLE {table} ALTER COLUMN updated_at SET DEFAULT now()")


def downgrade() -> None:
    tables = ['materias', 'bloques', 'clases', 'tareas', 'enrollments']
    for table in tables:
        op.execute(f"ALTER TABLE {table} ALTER COLUMN created_at DROP DEFAULT")
        op.execute(f"ALTER TABLE {table} ALTER COLUMN updated_at DROP DEFAULT")
