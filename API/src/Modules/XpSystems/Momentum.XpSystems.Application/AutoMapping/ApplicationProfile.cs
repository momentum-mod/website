using Momentum.XpSystems.Application.DTOs;
using Momentum.XpSystems.Application.DTOs.Cosmetic;
using Momentum.XpSystems.Application.DTOs.Rank;
using Momentum.XpSystems.Core.Models;
using Momentum.XpSystems.Core.Models.Cosmetic;
using Momentum.XpSystems.Core.Models.Rank;

namespace Momentum.XpSystems.Application.AutoMapping
{
    public class ApplicationProfile : AutoMapper.Profile
    {
        public ApplicationProfile()
        {
            CreateMap<XpSystem, XpSystemDto>();
            CreateMap<XpSystemDto, XpSystem>();

            CreateMap<RankXp, RankXpDto>();
            CreateMap<RankXpDto, RankXp>();

            CreateMap<Top10, Top10Dto>();
            CreateMap<Top10Dto, Top10>();

            CreateMap<Formula, FormulaDto>();
            CreateMap<FormulaDto, Formula>();

            CreateMap<Groups, GroupsDto>();
            CreateMap<GroupsDto, Groups>();

            CreateMap<CosmeticXp, CosmeticXpDto>();
            CreateMap<CosmeticXpDto, CosmeticXp>();

            CreateMap<Levels, LevelsDto>();
            CreateMap<LevelsDto, Levels>();

            CreateMap<Completions, CompletionsDto>();
            CreateMap<CompletionsDto, Completions>();

            CreateMap<Unique, UniqueDto>();
            CreateMap<UniqueDto, Unique>();

            CreateMap<UniqueTierScale, UniqueTierScaleDto>();
            CreateMap<UniqueTierScaleDto, UniqueTierScale>();

            CreateMap<Repeat, RepeatDto>();
            CreateMap<RepeatDto, Repeat>();

            CreateMap<RepeatTierScale, RepeatTierScaleDto>();
            CreateMap<RepeatTierScaleDto, RepeatTierScale>();
        }
    }
}
