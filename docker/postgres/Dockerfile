FROM postgres:18

RUN apt-get update && apt-get install -y build-essential postgresql-server-dev-18

WORKDIR /tmp/rank-points

COPY ./libs/db/src/pg_extensions/rank_points/ ./

RUN make && make install

# RUN apt-get remove -y build-essential postgresql-server-dev-18 && apt-get autoremove -y