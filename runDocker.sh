echo -e '-= Building MMoD Website Server Docker Image from Dockerfile =-\n'
docker build -t mmod-website-server-production -f ./Dockerfile .

echo -e '-= Stopping MMoD Website Server Production Container =-\n'
docker container stop mmod-website-server-production

echo -e '-= Runnning the MMoD Website Server Image =-\n'
docker run -v ./server/public/img/maps:/app/server/public/img/maps \
           -v ./server/public/maps:/app/server/public/maps \
           -v ./server/public/runs:/app/server/public/runs \
           --network host \
           --name "mmod-website-server-production" \
           --env-file env-vars.list \
           -d \
           mmod-website-server-production