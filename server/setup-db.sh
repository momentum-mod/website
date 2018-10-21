#!/usr/bin/env bash
set -ev
mysql -e "CREATE DATABASE momentum_test;"
mysql -e "CREATE USER mom_test@localhost;"
mysql -e "GRANT ALL PRIVILEGES ON momentum_test.* TO mom_test@localhost;"