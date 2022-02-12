import { Injectable } from '@nestjs/common';
import { Map, User, MapImage, Prisma } from '@prisma/client';
import { MapDto } from '../../@common/dto/map/map.dto';
import { PagedResponseDto } from "../../@common/dto/common/api-response.dto";
import { MapsRepo } from "./maps.repo";
import { CreateMapDto } from '../../@common/dto/map/createMap.dto';

@Injectable()
export class MapsService {
	constructor(
		private readonly mapRepo: MapsRepo		
	){}

	
	//#region Public

	public async GetAll(skip?: number, take?: number): Promise<PagedResponseDto<MapDto[]>> {
		const dbResponse = await this.mapRepo.GetAll(undefined, skip, take);

		const totalCount = dbResponse[1];
		const maps = dbResponse[0];

		const mapsDtos = maps.map((ctx) => {
			const map: Map = (ctx as any).map;
			const user: User = (ctx as any).user;
			const mapImages: MapImage[] = (ctx as any).images;

			const mapDto = new MapDto(map, user, mapImages);

			return mapDto;
		});

		return { 
			totalCount: totalCount,
			returnCount: mapsDtos.length,			
			response: mapsDtos
		}
	}

	public async Get(id: number): Promise<MapDto> {
		const dbResponse = await this.mapRepo.Get(id);
		
		const map: Map = (dbResponse as any).map;
		const user: User = (dbResponse as any).user;
		const mapImages: MapImage[] = (dbResponse as any).images;
		
		const mapDto = new MapDto(map, user, mapImages);

		return mapDto;
	}

	public async Insert(mapCreateObj: CreateMapDto): Promise<MapDto> {
		// Validate map upload limit
		// validate map name
		// create
		const createPrima: Prisma.MapCreateInput = {


			createdAt: new Date(),
			updatedAt: new Date()
		}


		const dbResponse = await this.mapRepo.Insert(createPrima);
		
		const map: Map = (dbResponse as any).map;
		const user: User = (dbResponse as any).user;
		const mapImages: MapImage[] = (dbResponse as any).images;
		
		const mapDto = new MapDto(map, user, mapImages);

		return mapDto;
	}

	//#endregion

	//#region Private

	/*
private genFileHash = (mapPath) => {
	return new Promise((resolve, reject) => {
		const hash = crypto.createHash('sha1').setEncoding('hex');
		fs.createReadStream(mapPath).pipe(hash)
			.on('error', err => reject(err))
			.on('finish', () => {
				resolve(hash.read())
			});
	});
};

private storeMapFile = (mapFile, mapModel) => {
	const moveMapTo = util.promisify(mapFile.mv);
	const fileName = mapModel.name + '.bsp';
	const basePath = __dirname + '/../../public/maps';
	const fullPath = basePath + '/' + fileName;
	const downloadURL = config.baseURL_API + '/api/maps/' + mapModel.id + '/download';
	return moveMapTo(fullPath).then(() => {
		return genFileHash(fullPath).then(hash => {
			return Promise.resolve({
				fileName: fileName,
				basePath: basePath,
				fullPath: fullPath,
				downloadURL: downloadURL,
				hash: hash
			})
		});
	});
};

private verifyMapNameNotTaken = (mapName) => {
	return Map.findOne({
		where: {
			name: mapName,
			statusFlag: {[Op.notIn]: [STATUS.REJECTED, STATUS.REMOVED]}
		},
		raw: true,
	}).then(mapWithSameName => {
		if (mapWithSameName)
			return Promise.reject(new ServerError(409, 'Map name already used'));
	});
};

private verifyMapUploadLimitNotReached = (submitterID) => {
	const mapUploadLimit = 5;
	return Map.count({
		where: {
			submitterID: submitterID,
			statusFlag: STATUS.PENDING,
		},
	}).then(count => {
		if (count >= mapUploadLimit)
			return Promise.reject(new ServerError(409, 'Map creation limit reached'));
	});
};
*/
	//#endregion
}
