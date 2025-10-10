use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RankXpGain {
    pub rank_xp: i32,
    pub group: GroupXpGain,
    pub formula: i32,
    pub top10: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GroupXpGain {
    pub group_xp: i32,
    pub group_num: i32,
}

#[derive(Clone)]
pub struct XpCalculator {
    formula_a: f64,
    formula_b: f64,
    wr_points: i32,
    rank_percentages: Vec<f64>,
    group_point_pcts: Vec<f64>,
    group_scale_factors: Vec<f64>,
    group_exponents: Vec<f64>,
    group_min_sizes: Vec<i32>,
    max_groups: usize,
}

impl Default for XpCalculator {
    fn default() -> Self {
        Self {
            formula_a: 1000.0,
            formula_b: 50.0,
            wr_points: 500,
            rank_percentages: vec![1.0, 0.8, 0.75, 0.7, 0.65, 0.6, 0.55, 0.5, 0.45, 0.4],
            group_point_pcts: vec![0.1, 0.05, 0.025],
            group_scale_factors: vec![0.15, 0.2, 0.25],
            group_exponents: vec![0.5, 0.4, 0.3],
            group_min_sizes: vec![20, 30, 40],
            max_groups: 3,
        }
    }
}

impl XpCalculator {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn get_rank_xp_for_rank(&self, rank: i32, completions: i32) -> RankXpGain {
        let mut rank_gain = RankXpGain {
            rank_xp: 0,
            group: GroupXpGain {
                group_xp: 0,
                group_num: -1,
            },
            formula: 0,
            top10: 0,
        };

        // Calculate formula points
        let formula_points = (self.formula_a / (rank as f64 + self.formula_b)).ceil() as i32;
        rank_gain.formula = formula_points;
        rank_gain.rank_xp += formula_points;

        // Calculate Top10 points if in top 10
        if rank <= 10 {
            let top10_points =
                (self.rank_percentages[(rank - 1) as usize] * self.wr_points as f64).ceil() as i32;
            rank_gain.top10 = top10_points;
            rank_gain.rank_xp += top10_points;
        } else {
            // Calculate group points
            let mut group_sizes = Vec::with_capacity(self.max_groups);
            for i in 0..self.max_groups {
                let group_size = (self.group_scale_factors[i]
                    * (completions as f64).powf(self.group_exponents[i]))
                .max(self.group_min_sizes[i] as f64) as i32;
                group_sizes.push(group_size);
            }

            let mut rank_offset = 11;
            for i in 0..self.max_groups {
                if rank < rank_offset + group_sizes[i] {
                    let group_points =
                        (self.wr_points as f64 * self.group_point_pcts[i]).ceil() as i32;
                    rank_gain.group.group_num = (i + 1) as i32;
                    rank_gain.group.group_xp = group_points;
                    rank_gain.rank_xp += group_points;
                    break;
                } else {
                    rank_offset += group_sizes[i];
                }
            }
        }

        rank_gain.rank_xp = rank_gain.rank_xp;
        rank_gain
    }
}
