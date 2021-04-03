#!/usr/bin/env bash
set -ev
mysql -uroot -proot -e "CREATE DATABASE momentum_test;"
mysql -uroot -proot -e "CREATE USER mom_test@localhost;"
mysql -uroot -proot -e "GRANT ALL PRIVILEGES ON momentum_test.* TO mom_test@localhost;"
