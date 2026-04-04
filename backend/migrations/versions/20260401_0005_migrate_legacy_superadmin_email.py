"""migrate legacy superadmin email

Revision ID: 20260401_0005
Revises: 20260331_0004
Create Date: 2026-04-01 00:00:00
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "20260401_0005"
down_revision: str | None = "20260331_0004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

LEGACY_SUPERADMIN_EMAIL = "superadmin@contentpro.local"
NEW_SUPERADMIN_EMAIL = "admin@edxso.com"


def upgrade() -> None:
    bind = op.get_bind()

    users = sa.table(
        "users",
        sa.column("id", sa.String(length=36)),
        sa.column("email", sa.String(length=255)),
    )

    legacy_user = bind.execute(
        sa.select(users.c.id).where(users.c.email == LEGACY_SUPERADMIN_EMAIL)
    ).first()
    if legacy_user is None:
        return

    conflicting_user = bind.execute(
        sa.select(users.c.id).where(users.c.email == NEW_SUPERADMIN_EMAIL)
    ).first()
    if conflicting_user is not None:
        raise RuntimeError(
            "Cannot migrate legacy superadmin email because admin@edxso.com already exists in users."
        )

    bind.execute(
        sa.text("UPDATE users SET email = :new_email WHERE email = :legacy_email"),
        {"new_email": NEW_SUPERADMIN_EMAIL, "legacy_email": LEGACY_SUPERADMIN_EMAIL},
    )


def downgrade() -> None:
    bind = op.get_bind()
    bind.execute(
        sa.text("UPDATE users SET email = :legacy_email WHERE email = :new_email"),
        {"legacy_email": LEGACY_SUPERADMIN_EMAIL, "new_email": NEW_SUPERADMIN_EMAIL},
    )
