// Tree-shaken ECharts: only the pieces we use.
import * as echarts from 'echarts/core'
import { BarChart, HeatmapChart, LineChart } from 'echarts/charts'
import { GridComponent, LegendComponent, PolarComponent, TooltipComponent, VisualMapComponent, DataZoomComponent } from 'echarts/components'
import { CanvasRenderer, SVGRenderer } from 'echarts/renderers'

echarts.use([BarChart, HeatmapChart, LineChart, GridComponent, LegendComponent, PolarComponent, TooltipComponent, VisualMapComponent, DataZoomComponent, CanvasRenderer, SVGRenderer])

export { echarts }
