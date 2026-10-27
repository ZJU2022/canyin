package logic

import (
	"testing"

	"canyin/internal/model"
)

// 教学例子：月租 6000，一天水电 100，不领工资。固定开支一天 300 元。
func sample(orders int, offlinePct, promoPct float64) model.Input {
	return model.Input{
		Price:       10,
		OfflineKeep: 3,
		OnlineKeep:  1,
		PromoKeep:   -1,
		OfflinePct:  offlinePct,
		PromoPct:    promoPct,
		RentMonth:   6000,
		DailyExtra:  100,
		DailyWage:   0,
		Orders:      orders,
	}
}

func TestAllDineInBreaksEvenAtOneHundred(t *testing.T) {
	got := Calc(sample(100, 100, 0))
	if got.Fixed != 300 {
		t.Fatalf("一天固定开支应为 300，得到 %v", got.Fixed)
	}
	if got.BreakEven != 100 || !got.Covered || got.DayProfit != 0 {
		t.Fatalf("100 碗全堂食应刚好保本，得到 %+v", got)
	}
	if got.Food != 7 || got.FoodRate != 70 {
		t.Fatalf("10 元留下 3 元，食材应为 7 元、占 70%%，得到食材 %v 占比 %v", got.Food, got.FoodRate)
	}
}

func TestPromoEatsTheDineInMargin(t *testing.T) {
	// 70 碗堂食留 3 元，30 碗活动外卖亏 1 元：毛利 180，还差 120。
	got := Calc(sample(100, 70, 100))
	if got.DayGross != 180 || got.DayProfit != -120 || got.Covered {
		t.Fatalf("活动外卖应吃掉堂食毛利，得到毛利 %v 结余 %v", got.DayGross, got.DayProfit)
	}
}

func TestLosingMixCannotBreakEven(t *testing.T) {
	got := Calc(sample(80, 0, 100))
	if !got.CannotBreakEven || got.BreakEven != 0 {
		t.Fatalf("全是亏钱的活动单时，应算不出保本碗数，得到 %+v", got)
	}
}

func TestValidateRejectsBadPercent(t *testing.T) {
	in := sample(10, 120, 0)
	if Validate(in) == "" {
		t.Fatal("堂食占比超过 100 应该被拒绝")
	}
}
