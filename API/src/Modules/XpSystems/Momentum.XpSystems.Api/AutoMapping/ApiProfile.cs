using AutoMapper;
using Momentum.XpSystems.Api.ViewModels;
using Momentum.XpSystems.Api.ViewModels.Rank;
using Momentum.XpSystems.Api.ViewModels.Cosmetic;
using Momentum.XpSystems.Application.DTOs;
using Momentum.XpSystems.Application.DTOs.Rank;
using Momentum.XpSystems.Application.DTOs.Cosmetic;

namespace Momentum.XpSystems.Api.AutoMapping
{
    public class ApiProfile : Profile
    {
        public ApiProfile()
        {
            CreateMap<XpSystemDto, XpSystemViewModel>();
            CreateMap<XpSystemViewModel, XpSystemDto>();

            CreateMap<RankXpViewModel, RankXpDto>();
            CreateMap<RankXpDto, RankXpViewModel>();

            CreateMap<Top10ViewModel, Top10Dto>();
            CreateMap<Top10Dto, Top10ViewModel>();

            CreateMap<FormulaViewModel, FormulaDto>();
            CreateMap<FormulaDto, FormulaViewModel>();

            CreateMap<GroupsViewModel, GroupsDto>();
            CreateMap<GroupsDto, GroupsViewModel>();

            CreateMap<CosmeticXpViewModel, CosmeticXpDto>();
            CreateMap<CosmeticXpDto, CosmeticXpViewModel>();

            CreateMap<LevelsViewModel, LevelsDto>();
            CreateMap<LevelsDto, LevelsViewModel>();

            CreateMap<CompletionsViewModel, CompletionsDto>();
            CreateMap<CompletionsDto, CompletionsViewModel>();

            CreateMap<UniqueViewModel, UniqueDto>();
            CreateMap<UniqueDto, UniqueViewModel>();

            CreateMap<UniqueTierScaleViewModel, UniqueTierScaleDto>();
            CreateMap<UniqueTierScaleDto, UniqueTierScaleViewModel>();

            CreateMap<RepeatViewModel, RepeatDto>();
            CreateMap<RepeatDto, RepeatViewModel>();

            CreateMap<RepeatTierScaleViewModel, RepeatTierScaleDto>();
            CreateMap<RepeatTierScaleDto, RepeatTierScaleViewModel>();
        }
    }
}
