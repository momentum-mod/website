import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Map } from '@prisma/client';
import { PagedResponseDto } from "../dto/api-response.dto";
import { MapsService } from "../services/maps.service";

@Controller("api/v1/maps")
@ApiTags("Maps")
export class MapsController {

	constructor(private readonly mapsService: MapsService) {}

	@Get()
	@ApiOperation({ summary: "Returns all maps" })
	@ApiQuery({
		name: "skip",
		type: Number,
		description: "Offset this many records",
		required: false
	})
	@ApiQuery({
		name: "take",
		type: Number,
		description: "Take this many records",
		required: false
	})
	public async GetAllMaps(@Query('skip') skip?: number, @Query('take') take?: number): Promise<PagedResponseDto<Map[]>> {
		return this.mapsService.getAll(skip, take);
	}

	@Get(":mapID")	
	@ApiOperation({ summary: "Returns a single map" })
	@ApiQuery({
		name: "mapID",
		type: Number,
		description: "Target Map ID",
		required: true
	})
	public async GetMap(@Param('mapID') mapID: number): Promise<Map> {
		return this.mapsService.get(mapID);
	}
}
