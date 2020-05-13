echo -e '-= Pulling MMOD Website Server Image from GitHub Packages =-\n'
docker pull docker.pkg.github.com/momentum-mod/website/mmod-website:staging

echo -e '-= Stopping MMoD Website Container =-\n'
docker container stop mmod-website

echo -e '-= Runnning the MMoD Website Server Image =-\n'
docker run -v $PWD/server/public/img/maps:/app/server/public/img/maps \
           -v $PWD/server/public/maps:/app/server/public/maps \
           -v $PWD/server/public/runs:/app/server/public/runs \
           --network host \
           --name "mmod-website" \
           --env-file env-vars.list \
           -d \
           docker.pkg.github.com/momentum-mod/website/mmod-website:staging
