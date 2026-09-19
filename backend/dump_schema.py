import sys
from sqlalchemy import create_mock_engine
from app.models.base import Base
import app.models  # Ensures all models are loaded

def dump_schema(filename):
    with open(filename, 'w') as f:
        def dump(sql, *multiparams, **params):
            f.write(str(sql.compile(dialect=engine.dialect)).strip() + ";\n")
        
        engine = create_mock_engine('postgresql://', dump)
        Base.metadata.create_all(engine, checkfirst=False)

if __name__ == "__main__":
    dump_schema("schema_dump.sql")
    print("Schema successfully dumped to schema_dump.sql")
