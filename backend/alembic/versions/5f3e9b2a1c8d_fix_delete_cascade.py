"""fix_delete_cascade

Revision ID: 5f3e9b2a1c8d
Revises: 07956efe99ed
Create Date: 2026-04-24 02:30:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '5f3e9b2a1c8d'
down_revision: Union[str, Sequence[str], None] = '1f0b9ce8a08d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # 1. bloques -> materias
    op.drop_constraint('bloques_materia_id_fkey', 'bloques', type_='foreignkey')
    op.create_foreign_key('bloques_materia_id_fkey', 'bloques', 'materias', ['materia_id'], ['id'], ondelete='CASCADE')

    # 2. enrollments -> materias
    op.drop_constraint('enrollments_materia_id_fkey', 'enrollments', type_='foreignkey')
    op.create_foreign_key('enrollments_materia_id_fkey', 'enrollments', 'materias', ['materia_id'], ['id'], ondelete='CASCADE')
    
    # 3. enrollments -> users
    op.drop_constraint('enrollments_user_id_fkey', 'enrollments', type_='foreignkey')
    op.create_foreign_key('enrollments_user_id_fkey', 'enrollments', 'users', ['user_id'], ['id'], ondelete='CASCADE')

    # 4. clases -> bloques
    op.drop_constraint('clases_bloque_id_fkey', 'clases', type_='foreignkey')
    op.create_foreign_key('clases_bloque_id_fkey', 'clases', 'bloques', ['bloque_id'], ['id'], ondelete='CASCADE')

    # 5. tareas -> clases
    op.drop_constraint('tareas_clase_id_fkey', 'tareas', type_='foreignkey')
    op.create_foreign_key('tareas_clase_id_fkey', 'tareas', 'clases', ['clase_id'], ['id'], ondelete='CASCADE')

    # 6. entregas -> tareas
    op.drop_constraint('entregas_tarea_id_fkey', 'entregas', type_='foreignkey')
    op.create_foreign_key('entregas_tarea_id_fkey', 'entregas', 'tareas', ['tarea_id'], ['id'], ondelete='CASCADE')

    # 7. entregas -> users
    op.drop_constraint('entregas_user_id_fkey', 'entregas', type_='foreignkey')
    op.create_foreign_key('entregas_user_id_fkey', 'entregas', 'users', ['user_id'], ['id'], ondelete='CASCADE')

    # 8. consultas -> clases
    op.drop_constraint('consultas_clase_id_fkey', 'consultas', type_='foreignkey')
    op.create_foreign_key('consultas_clase_id_fkey', 'consultas', 'clases', ['clase_id'], ['id'], ondelete='CASCADE')

    # 9. consultas -> users
    op.drop_constraint('consultas_student_id_fkey', 'consultas', type_='foreignkey')
    op.create_foreign_key('consultas_student_id_fkey', 'consultas', 'users', ['student_id'], ['id'], ondelete='CASCADE')

    # 10. clases_completadas -> clases
    op.drop_constraint('clases_completadas_clase_id_fkey', 'clases_completadas', type_='foreignkey')
    op.create_foreign_key('clases_completadas_clase_id_fkey', 'clases_completadas', 'clases', ['clase_id'], ['id'], ondelete='CASCADE')

    # 11. clases_completadas -> users
    op.drop_constraint('clases_completadas_user_id_fkey', 'clases_completadas', type_='foreignkey')
    op.create_foreign_key('clases_completadas_user_id_fkey', 'clases_completadas', 'users', ['user_id'], ['id'], ondelete='CASCADE')

def downgrade() -> None:
    # Standard logic to restore original foreign keys (without ondelete='CASCADE')
    # 1. bloques -> materias
    op.drop_constraint('bloques_materia_id_fkey', 'bloques', type_='foreignkey')
    op.create_foreign_key('bloques_materia_id_fkey', 'bloques', 'materias', ['materia_id'], ['id'])

    # 2. enrollments -> materias
    op.drop_constraint('enrollments_materia_id_fkey', 'enrollments', type_='foreignkey')
    op.create_foreign_key('enrollments_materia_id_fkey', 'enrollments', 'materias', ['materia_id'], ['id'])
    
    # 3. enrollments -> users
    op.drop_constraint('enrollments_user_id_fkey', 'enrollments', type_='foreignkey')
    op.create_foreign_key('enrollments_user_id_fkey', 'enrollments', 'users', ['user_id'], ['id'])

    # 4. clases -> bloques
    op.drop_constraint('clases_bloque_id_fkey', 'clases', type_='foreignkey')
    op.create_foreign_key('clases_bloque_id_fkey', 'clases', 'bloques', ['bloque_id'], ['id'])

    # 5. tareas -> clases
    op.drop_constraint('tareas_clase_id_fkey', 'tareas', type_='foreignkey')
    op.create_foreign_key('tareas_clase_id_fkey', 'tareas', 'clases', ['clase_id'], ['id'])

    # 6. entregas -> tareas
    op.drop_constraint('entregas_tarea_id_fkey', 'entregas', type_='foreignkey')
    op.create_foreign_key('entregas_tarea_id_fkey', 'entregas', 'tareas', ['tarea_id'], ['id'])

    # 7. entregas -> users
    op.drop_constraint('entregas_user_id_fkey', 'entregas', type_='foreignkey')
    op.create_foreign_key('entregas_user_id_fkey', 'entregas', 'users', ['user_id'], ['id'])

    # 8. consultas -> clases
    op.drop_constraint('consultas_clase_id_fkey', 'consultas', type_='foreignkey')
    op.create_foreign_key('consultas_clase_id_fkey', 'consultas', 'clases', ['clase_id'], ['id'])

    # 9. consultas -> users
    op.drop_constraint('consultas_student_id_fkey', 'consultas', type_='foreignkey')
    op.create_foreign_key('consultas_student_id_fkey', 'consultas', 'users', ['student_id'], ['id'])

    # 10. clases_completadas -> clases
    op.drop_constraint('clases_completadas_clase_id_fkey', 'clases_completadas', type_='foreignkey')
    op.create_foreign_key('clases_completadas_clase_id_fkey', 'clases_completadas', 'clases', ['clase_id'], ['id'])

    # 11. clases_completadas -> users
    op.drop_constraint('clases_completadas_user_id_fkey', 'clases_completadas', type_='users')
    op.create_foreign_key('clases_completadas_user_id_fkey', 'clases_completadas', 'users', ['user_id'], ['id'])
