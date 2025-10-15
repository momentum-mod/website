# Makefile
MODULE_big = rank_points
OBJS = rank_points.o

EXTENSION = rank_points
DATA = rank_points--1.0.sql
PGFILEDESC = "rank_points - Rank point calculation function"

PG_CONFIG = pg_config
PGXS := $(shell $(PG_CONFIG) --pgxs)
include $(PGXS)
