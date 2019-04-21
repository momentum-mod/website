#!/usr/bin/env bash
set -ev
mysql -u "root" --password="" -e "CREATE DATABASE momentum_test;"
mysql -u "root" --password="" -e "CREATE USER mom_test@localhost;"
mysql -u "root" --password="" -e "GRANT ALL PRIVILEGES ON momentum_test.* TO mom_test@localhost;"
