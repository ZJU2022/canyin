// Package logic 只负责规则，不碰网页。
// 页面把填写的数送进来，这里算出保本碗数和要说给人听的那句话。
// 规则可以单独考试：看 shop_test.go。改算法时不用打开浏览器。
package logic

import (
	"fmt"
	"math"

	"canyin/internal/model"
)

// Validate 检查填写的数能不能拿去算。不能算时，返回给页面看的那一句。
func Validate(in model.Input) string {
	if in.Price < 0 {
		return "客单价不能是负数"
	}
	if in.OfflinePct < 0 || in.OfflinePct > 100 {
		return "堂食占比要在 0 到 100 之间"
	}
	if in.PromoPct < 0 || in.PromoPct > 100 {
		return "活动比例要在 0 到 100 之间"
	}
	if in.RentMonth < 0 || in.DailyExtra < 0 || in.DailyWage < 0 {
		return "房租、水电和人工不能是负数"
	}
	if in.Orders < 0 {
		return "碗数不能是负数"
	}
	return ""
}

// Calc 算一天。
//
// 毛利：售价减去这碗食材之后留下的钱。房租还没扣。
// 固定开支：今天一个客人都没有，仍然要付的钱。月租除以 30，再加上水电和人工。
// 保本碗数：固定开支 ÷ 平均一碗毛利。到了这个碗数，不赚不亏。
func Calc(in model.Input) model.Result {
	dineN, onlineN := splitCount(in.Orders, in.OfflinePct)
	promoN, plainN := splitCount(onlineN, in.PromoPct)

	channels := []model.Channel{
		{ID: "dine", Name: "堂食", Orders: dineN, Keep: in.OfflineKeep, Gross: float64(dineN) * in.OfflineKeep},
		{ID: "plain", Name: "外卖，不参加活动", Orders: plainN, Keep: in.OnlineKeep, Gross: float64(plainN) * in.OnlineKeep},
		{ID: "promo", Name: "外卖，参加活动", Orders: promoN, Keep: in.PromoKeep, Gross: float64(promoN) * in.PromoKeep},
	}

	dayGross := channels[0].Gross + channels[1].Gross + channels[2].Gross
	blended := mixKeep(in)
	if in.Orders > 0 {
		// 碗数取整之后，用真实的这三堆碗来算平均，和图上的色块一致。
		blended = dayGross / float64(in.Orders)
	}

	dailyRent := in.RentMonth / 30
	fixed := dailyRent + in.DailyExtra + in.DailyWage
	breakEven, cannot := breakEvenBowls(fixed, blended)
	dayProfit := dayGross - fixed
	covered := !cannot && dayGross >= fixed

	food := in.Price - in.OfflineKeep
	foodRate := 0.0
	if in.Price > 0 {
		foodRate = food / in.Price * 100
	}

	out := model.Result{
		Food:            food,
		FoodRate:        foodRate,
		Blended:         blended,
		Fixed:           fixed,
		DailyRent:       dailyRent,
		BreakEven:       breakEven,
		CannotBreakEven: cannot,
		DayGross:        dayGross,
		DayProfit:       dayProfit,
		MonthProfit:     dayProfit * 30,
		Covered:         covered,
		Channels:        channels,
		Formula:         formulaText(fixed, blended, breakEven, cannot),
		Message:         message(in.Orders, fixed, dayGross, dayProfit, breakEven, cannot, covered),
		Notes:           notes(in, foodRate),
	}
	return out
}

// mixKeep 按占比算平均一碗毛利，不依赖今天卖了多少碗。
// 卖 0 碗时仍然要能算出“如果按这个比例卖，保本是多少”。
func mixKeep(in model.Input) float64 {
	offline := in.OfflinePct / 100
	online := 1 - offline
	plain := online * (1 - in.PromoPct/100)
	promo := online * (in.PromoPct / 100)
	return offline*in.OfflineKeep + plain*in.OnlineKeep + promo*in.PromoKeep
}

// splitCount 把 total 碗按百分比拆开。返回（分到的碗，剩下的碗）。
func splitCount(total int, pct float64) (part, rest int) {
	if total <= 0 {
		return 0, 0
	}
	part = int(math.Round(float64(total) * pct / 100))
	if part < 0 {
		part = 0
	}
	if part > total {
		part = total
	}
	return part, total - part
}

func breakEvenBowls(fixed, blended float64) (n int, cannot bool) {
	if blended <= 0 {
		return 0, true
	}
	if fixed <= 0 {
		return 0, false
	}
	return int(math.Ceil(fixed / blended)), false
}

func formulaText(fixed, blended float64, n int, cannot bool) string {
	if cannot {
		return "平均一碗留下的钱小于或等于 0，除不开保本碗数。卖得越多，亏得越多。"
	}
	if fixed <= 0 {
		return "固定开支是 0。把月租填上，才能看出一天要卖多少碗。"
	}
	exact := math.Abs(float64(n)-fixed/blended) < 0.001
	if exact {
		return fmt.Sprintf("保本碗数 = 一天固定开支 %s ÷ 平均一碗 %s = %d 碗", yuan(fixed), perBowl(blended), n)
	}
	return fmt.Sprintf("保本碗数 = 一天固定开支 %s ÷ 平均一碗 %s，向上取整为 %d 碗", yuan(fixed), perBowl(blended), n)
}

func perBowl(n float64) string {
	if math.Abs(n-math.Round(n)) < 0.001 {
		return fmt.Sprintf("%d 元", int(math.Round(n)))
	}
	return fmt.Sprintf("%.2f 元", n)
}

func message(orders int, fixed, dayGross, dayProfit float64, breakEven int, cannot, covered bool) string {
	if fixed <= 0 && !cannot {
		return fmt.Sprintf("卖出 %d 碗，毛利 %s。还没有房租、水电和人工，把月租填上才能看出赚多少。", orders, yuan(dayGross))
	}
	if dayProfit >= 0 && !cannot {
		return fmt.Sprintf("卖出 %d 碗，扣掉这一天的开支，赚 %s。", orders, yuan(dayProfit))
	}
	if cannot {
		return fmt.Sprintf("卖出 %d 碗，扣掉这一天的开支，亏 %s。平均一碗留不下钱，卖得越多亏得越多。", orders, yuan(-dayProfit))
	}
	if !covered {
		return fmt.Sprintf("卖出 %d 碗，扣掉这一天的开支，亏 %s。按现在的堂食和外卖比例，要卖到 %d 碗才保本。", orders, yuan(-dayProfit), breakEven)
	}
	return fmt.Sprintf("卖出 %d 碗，扣掉这一天的开支，赚 %s。", orders, yuan(dayProfit))
}

func notes(in model.Input, foodRate float64) []string {
	var list []string
	if in.Price > 0 && foodRate > 45 {
		list = append(list, fmt.Sprintf(
			"按堂食留下的钱反推，食材约占售价的 %s%%。快餐更常见的希望区间是三成到四成半。请妈妈拿一道招牌，按进货价算一碗，再改「堂食留下」。",
			yuanNumber(foodRate),
		))
	}
	if in.DailyWage == 0 {
		list = append(list, "人工填的是 0。结余里还含着你和妈妈的劳动，还没变成工资。")
	}
	list = append(list, "月结果按 30 天都营业估算。哪天休息，就少算一天。")
	return list
}

func yuan(n float64) string {
	return yuanNumber(n) + " 元"
}

func yuanNumber(n float64) string {
	sign := ""
	if n < 0 {
		sign = "-"
		n = -n
	}
	if n >= 100 || math.Abs(n-math.Round(n)) < 0.001 {
		return sign + fmt.Sprintf("%d", int(math.Round(n)))
	}
	rounded := math.Round(n*10) / 10
	return sign + fmt.Sprintf("%.1f", rounded)
}
