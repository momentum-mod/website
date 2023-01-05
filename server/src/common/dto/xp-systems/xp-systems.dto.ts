import { ApiProperty, PickType } from '@nestjs/swagger';
import { NestedDto } from '@lib/dto.lib';
import { IsArray, IsDefined, IsNumber } from 'class-validator';

// Could implement RankXpParams and CosXpParams in xp-systems.interface.ts but class-validator requires
// we give it this wacky structure.

// TODO: bunch of this can be readonly?
class CosXpTierScale {
    @ApiProperty()
    @IsNumber()
    linear: number;

    @ApiProperty()
    @IsNumber()
    staged: number;

    @ApiProperty()
    @IsNumber()
    stages: number;

    @ApiProperty()
    @IsNumber()
    bonus: number;
}

class CosXpUniqueTierScale extends PickType(CosXpTierScale, ['linear', 'staged'] as const) {}
class CosXpRepeatTierScale extends CosXpTierScale {}
class CosXpUnique {
    @NestedDto(CosXpUniqueTierScale)
    @IsDefined()
    tierScale: CosXpUniqueTierScale;
}
class CosXpRepeat {
    @NestedDto(CosXpRepeatTierScale)
    @IsDefined()
    tierScale: CosXpRepeatTierScale;
}

class CosXpCompletions {
    @NestedDto(CosXpUnique)
    @IsDefined()
    unique: CosXpUnique;

    @NestedDto(CosXpRepeat)
    @IsDefined()
    repeat: CosXpRepeat;
}
class CosXpLevels {
    @ApiProperty()
    @IsNumber()
    maxLevels: number;

    @ApiProperty()
    @IsNumber()
    startingValue: number;

    @ApiProperty()
    @IsNumber()
    linearScaleBaseIncrease: number;

    @ApiProperty()
    @IsNumber()
    linearScaleInterval: number;

    @ApiProperty()
    @IsNumber()
    linearScaleIntervalMultiplier: number;

    @ApiProperty()
    @IsNumber()
    staticScaleStart: number;

    @ApiProperty()
    @IsNumber()
    staticScaleBaseMultiplier: number;

    @ApiProperty()
    @IsNumber()
    staticScaleInterval: number;

    @ApiProperty()
    @IsNumber()
    staticScaleIntervalMultiplier: number;
}

class CosXpDto {
    @NestedDto(CosXpCompletions)
    @IsDefined()
    completions: CosXpCompletions;

    @NestedDto(CosXpLevels)
    @IsDefined()
    levels: CosXpLevels;
}

class RankXpFormula {
    @ApiProperty()
    @IsNumber()
    A: number;

    @ApiProperty()
    @IsNumber()
    B: number;
}

class RankXpGroups {
    @ApiProperty()
    @IsNumber()
    maxGroups: number;

    @ApiProperty({
        type: Number,
        isArray: true,
        minLength: 4,
        maxLength: 4
    })
    @IsNumber({}, { each: true })
    @IsArray()
    groupScaleFactors: number[];

    @ApiProperty({
        type: Number,
        isArray: true,
        minLength: 4,
        maxLength: 4
    })
    @IsNumber({}, { each: true })
    @IsArray()
    groupExponents: number[];

    @ApiProperty({
        type: Number,
        isArray: true,
        minLength: 4,
        maxLength: 4
    })
    @IsNumber({}, { each: true })
    @IsArray()
    groupMinSizes: number[];

    @ApiProperty({
        type: Number,
        isArray: true,
        minLength: 4,
        maxLength: 4
    })
    @IsNumber({}, { each: true })
    @IsArray()
    groupPointPcts: number[];
}

class RankXpTop10 {
    @ApiProperty()
    @IsNumber()
    WRPoints: number;

    @ApiProperty({
        type: Number,
        isArray: true,
        minLength: 10,
        maxLength: 10
    })
    @IsNumber({}, { each: true })
    @IsArray()
    rankPercentages: number[];
}

class RankXpDto {
    @NestedDto(RankXpFormula)
    @IsDefined()
    formula: RankXpFormula;

    @NestedDto(RankXpGroups)
    @IsDefined()
    groups: RankXpGroups;

    @NestedDto(RankXpTop10)
    @IsDefined()
    top10: RankXpTop10;
}

export class XpSystemsDto {
    // The old API returns the id, createdAt and updatedAt fields as well. I'm leaving these fields commented if it turns out that they
    // need to be returned too. In that case they xp-systems.service needs to change so that its "get()" function returns database data
    // or the dates and id will have to be stored in class fields

    // @ApiProperty()
    // @IsInt()
    // id: number;
    @IsDefined()
    @NestedDto(RankXpDto)
    @IsDefined()
    rankXP: RankXpDto;

    @IsDefined()
    @NestedDto(CosXpDto)
    @IsDefined()
    cosXP: CosXpDto;

    // @ApiProperty()
    // @IsDateString()
    // createdAt: string;

    // @ApiProperty()
    // @IsDateString()
    // updatedAt: string;
}

export class UpdateXpSystemsDto extends PickType(XpSystemsDto, ['cosXP', 'rankXP'] as const) {}
