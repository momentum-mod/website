import { Component, inject, Input, NgZone, ViewChild } from '@angular/core';

import { LeaderboardRun } from '@momentum/constants';

function formatTime(sec) {
  if (!Number.isFinite(sec)) return '';

  const totalMs = Math.round(sec * 1000);
  const ms = Math.floor((totalMs % 1000) / 10); // 2 decimals
  const totalSec = Math.floor(totalMs / 1000);
  const s = totalSec % 60;
  const totalMin = Math.floor(totalSec / 60);
  const m = totalMin % 60;
  const h = Math.floor(totalMin / 60);

  const ss = `${String(s).padStart(m > 0 || h > 0 ? 2 : 1, '0')}`;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${ss}`;
  if (m > 0) return `${m}:${ss}`;
  return `${ss}.${String(ms).padStart(2, '0')}`;
}

@Component({
  selector: 'm-record-progression-chart',
  imports: [],
  template: `
    <!-- The div that echarts will use must have a height and width before being initialized -->
    <div #chart class="w-full h-[clamp(160px,40vh,480px)]"></div>
  `
})
export class RecordProgressionChartComponent {
  protected chart: any;
  @ViewChild('chart', { static: true }) protected chartElementRef;
  @Input({ required: true }) runs: LeaderboardRun[];
  protected ngZone = inject(NgZone);
  protected resizeObserver: ResizeObserver;

  async ngAfterViewInit(): Promise<void> {
    // load echarts modules into a separate chunk
    const echarts = await import('echarts/core');
    const [
      { LineChart },
      { GridComponent, TooltipComponent },
      { SVGRenderer }
    ] = await Promise.all([
      import('echarts/charts'),
      import('echarts/components'),
      import('echarts/renderers')
    ]);

    echarts.use([LineChart, GridComponent, TooltipComponent, SVGRenderer]);

    this.ngZone.runOutsideAngular(() => {
      this.chart = echarts.init(this.chartElementRef.nativeElement);

      const seriesData = this.runs
        .slice()
        .sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        )
        .map((run) => ({
          value: [run.createdAt, run.time],
          user: run.user
        }));

      this.chart.setOption({
        backgroundColor: 'transparent',
        textStyle: { fontFamily: 'inherit', color: '#E6E6E6' },
        grid: { left: 64, right: 38, top: 28, bottom: 56 },

        tooltip: {
          trigger: 'item',
          triggerOn: 'click',
          enterable: true,
          hideDelay: 800,
          confine: true,
          backgroundColor: 'rgba(61,61,61,0.7)',
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.08)',
          padding: [8, 14],
          textStyle: { color: '#FFFFFF', fontSize: 14, fontWeight: 500 },
          extraCssText:
            'border-radius: 12px; backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); box-shadow: 0 6px 20px rgba(0,0,0,0.25);',
          formatter: (p) => {
            const user = p.data.user;
            const alias = user.alias;
            const avatar = user.avatarURL;
            const profile = `/profile/${user.id}`;

            const timeText = formatTime(p.value[1]);
            const dateText = new Date(p.value[0]).toLocaleString();

            return `
              <div class="flex items-center gap-2 text-white max-w-xs">
                <img
                  src="${avatar}"
                  class="h-16 w-auto rounded-md object-contain flex-shrink-0"
                  alt="profile picture"/>
                <div class="flex flex-col min-w-0">
                  <a
                    href="${profile}"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-[#9bd1ff] font-semibold truncate hover:underline"
                  >
                    ${alias}
                  </a>

                  <div class="mt-1.5 text-sm font-semibold">
                    ${timeText}
                    <span class="ml-1.5 text-xs font-semibold text-[#cfeeff]">
                      WR
                    </span>
                  </div>

                  <div class="mt-1.5 text-xs text-gray-300">
                    ${dateText}
                  </div>
                </div>
              </div>

            `;
          }
        },

        xAxis: {
          type: 'time',
          name: 'Date',
          nameLocation: 'middle',
          nameGap: 34,
          min: 'dataMin',
          max: 'dataMax',
          splitNumber: 3,

          nameTextStyle: {
            color: '#F2F2F2',
            fontSize: 14,
            fontWeight: 600
          },
          axisLabel: {
            show: true,
            color: '#F2F2F2',
            fontSize: 13,
            fontWeight: 600,
            formatter: (value) =>
              new Intl.DateTimeFormat(undefined, {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
              }).format(new Date(value))
          },

          axisTick: { show: true, alignWithLabel: true },
          axisLine: { show: true, lineStyle: { color: '#FFFFFF', width: 1 } },
          splitLine: { lineStyle: { color: 'rgba(255,255,255,0.16)' } }
        },

        yAxis: {
          type: 'value',
          min: 'dataMin',
          max: 'dataMax',
          boundaryGap: [0.1, 0.1],
          name: 'Time',
          nameLocation: 'middle',
          nameRotate: 90,
          nameGap: 48,
          nameTextStyle: { color: '#F2F2F2', fontSize: 14, fontWeight: 600 },
          axisLine: {
            show: true,
            lineStyle: {
              color: '#FFFFFF',
              width: 1
            }
          },
          axisTick: { show: false },
          axisLabel: {
            color: '#F2F2F2',
            fontSize: 13,
            fontWeight: 600,
            formatter: formatTime
          },
          splitLine: {
            lineStyle: { color: 'rgba(255,255,255,0.16)' }
          }
        },

        series: [
          // Colored area under the chart
          {
            type: 'line',
            step: 'end',
            smooth: false,
            symbol: 'none',
            lineStyle: { width: 0 },
            areaStyle: { color: 'rgba(24,150,206,0.12)' },
            silent: true,
            cursor: 'default',
            data: seriesData
          },

          // Line and points
          {
            name: 'WR',
            type: 'line',
            step: 'end',
            smooth: false,
            symbol: 'circle',
            symbolSize: 12,
            lineStyle: { color: '#1896ce', width: 2.5 },
            itemStyle: { color: '#1896ce' },
            cursor: 'pointer',
            emphasis: {},
            data: seriesData
          }
        ]
      });

      this.resizeObserver = new ResizeObserver(() => {
        this.chart.resize();
      });
      this.resizeObserver.observe(this.chartElementRef.nativeElement);
    });
  }

  ngOnDestroy() {
    this.resizeObserver?.disconnect();
    this.chart?.dispose();
  }
}
