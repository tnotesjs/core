<script setup>
import { BarChart, LineChart } from 'echarts/charts'
import { GridComponent, TooltipComponent } from 'echarts/components'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { computed } from 'vue'
import VChart from 'vue-echarts'

use([CanvasRenderer, BarChart, LineChart, GridComponent, TooltipComponent])

const props = defineProps({
  completedNotesCount: {
    type: Object,
    required: true,
  },
})

const chartOption = computed(() => {
  const data = props.completedNotesCount
  if (!data || typeof data === 'number') return {}

  const sortedEntries = Object.entries(data).sort((a, b) =>
    a[0].localeCompare(b[0]),
  )

  const dates = sortedEntries.map(([date]) => date)
  const counts = sortedEntries.map(([, count]) => count)
  const increments = counts.map((count, index) =>
    index === 0 ? 0 : count - counts[index - 1],
  )

  return {
    tooltip: {
      trigger: 'axis',
      formatter: (params) => {
        const index = params[0].dataIndex
        const date = params[0].axisValue
        const total = params[0].value
        const increment = increments[index]

        let result = `${date}<br/>${total}`
        if (increment !== 0) {
          const sign = increment > 0 ? '+' : ''
          const color = increment > 0 ? '#10b981' : '#ef4444'
          result += ` <span style="color: ${color};">(${sign}${increment})</span>`
        }
        return result
      },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '10%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: dates,
      axisLabel: { fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      axisLabel: { fontSize: 11 },
      splitLine: {
        lineStyle: { type: 'dashed', opacity: 0.3 },
      },
    },
    series: [
      {
        name: '笔记数量',
        type: 'line',
        smooth: true,
        data: counts,
        itemStyle: { color: '#646cff' },
        lineStyle: { width: 2 },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(100, 108, 255, 0.3)' },
              { offset: 1, color: 'rgba(100, 108, 255, 0.05)' },
            ],
          },
        },
        emphasis: { focus: 'series' },
      },
    ],
  }
})
</script>

<template>
  <div class="notes-trend-chart">
    <v-chart :option="chartOption" autoresize :style="{ height: '180px' }" />
  </div>
</template>

<style scoped lang="scss">
.notes-trend-chart {
  padding: 0.75rem;
  border-radius: 8px;
}
</style>
