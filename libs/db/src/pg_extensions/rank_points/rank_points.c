#include "postgres.h"
#include "fmgr.h"
#include "utils/builtins.h"
#include <math.h>

PG_MODULE_MAGIC;

/* XP calculation constants */
#define WR_POINTS 3000
#define FORMULA_A 50000
#define FORMULA_B 49
#define MAX_GROUPS 4

/* Top 10 rank percentages */
static const double rank_percentages[10] = {
    1.0, 0.75, 0.68, 0.61, 0.57, 0.53, 0.505, 0.48, 0.455, 0.43
};

/* Group configuration */
static const double group_scale_factors[MAX_GROUPS] = {1.0, 1.5, 2.0, 2.5};
static const double group_epointsonents[MAX_GROUPS] = {0.5, 0.56, 0.62, 0.68};
static const int group_min_sizes[MAX_GROUPS] = {10, 45, 125, 250};
static const double group_point_pcts[MAX_GROUPS] = {0.2, 0.13, 0.07, 0.03};

/* Function to calculate group sizes dynamically */
static void calculate_group_sizes(int completions, int *group_sizes) {
    for (int i = 0; i < MAX_GROUPS; i++) {
        double calculated_size = group_scale_factors[i] * pow(completions, group_epointsonents[i]);
        group_sizes[i] = (int)fmax(calculated_size, group_min_sizes[i]);
    }
}

PG_FUNCTION_INFO_V1(get_points_for_rank);

Datum
get_points_for_rank(PG_FUNCTION_ARGS)
{
    int32 rank = PG_GETARG_INT32(0);
    int32 completions = PG_GETARG_INT32(1);
    
    int32 points = 0;
    int32 formula_points = 0;
    int32 top10_points = 0;
    int32 group_points = 0;
    
    // Calculate formula points
    formula_points = (int32)ceil((double)FORMULA_A / (rank + FORMULA_B));
    points += formula_points;
    
    // Calculate Top 10 points
    if (rank <= 10) {
        top10_points = (int32)ceil(rank_percentages[rank - 1] * WR_POINTS);
        points += top10_points;
    } else {
        // Calculate group points
        int group_sizes[MAX_GROUPS];
        calculate_group_sizes(completions, group_sizes);
        
        int rank_offset = 11;
        for (int i = 0; i < MAX_GROUPS; i++) {
            if (rank < rank_offset + group_sizes[i]) {
                group_points = (int32)ceil(WR_POINTS * group_point_pcts[i]);
                points += group_points;
                break;
            } else {
                rank_offset += group_sizes[i];
            }
        }
    }
    
    PG_RETURN_INT32(points);
}
