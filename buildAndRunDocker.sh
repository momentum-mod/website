echo -e '-= Building MMoD Website Server Docker Image from Dockerfile =-\n'
docker build -t mmod-website-server -f /server/Dockerfile .

echo -e '-= Stopping MMoD Website Server Container =-\n'
docker container stop mmod-website-server

echo -e '-= Runnning the MMoD Website Server Image =-\n'
docker run -v $PWD/server/public/img/maps:/app/server/public/img/maps \
           -v $PWD/server/public/maps:/app/server/public/maps \
           -v $PWD/server/public/runs:/app/server/public/runs \
           --network host \
           --name "mmod-website-server" \
           --env-file env-vars.list \
           -d \
           mmod-website-server
