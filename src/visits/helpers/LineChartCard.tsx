import React, { useState, useMemo } from 'react';
import {
  Card,
  CardHeader,
  CardBody,
  UncontrolledDropdown,
  DropdownToggle,
  DropdownMenu,
  DropdownItem,
} from 'reactstrap';
import { Line } from 'react-chartjs-2';
import { always, cond, reverse } from 'ramda';
import moment from 'moment';
import { ChartData, ChartDataSets } from 'chart.js';
import { NormalizedVisit, Stats, Visit } from '../types';
import { fillTheGaps } from '../../utils/helpers/visits';
import { useToggle } from '../../utils/helpers/hooks';
import { rangeOf } from '../../utils/utils';
import ToggleSwitch from '../../utils/ToggleSwitch';
import './LineChartCard.scss';

interface LineChartCardProps {
  title: string;
  highlightedLabel?: string;
  visits: Visit[];
  highlightedVisits: NormalizedVisit[];
}

type Step = 'monthly' | 'weekly' | 'daily' | 'hourly';

const STEPS_MAP: Record<Step, string> = {
  monthly: 'Month',
  weekly: 'Week',
  daily: 'Day',
  hourly: 'Hour',
};

const STEP_TO_DATE_UNIT_MAP: Record<Step, moment.unitOfTime.Diff> = {
  hourly: 'hour',
  daily: 'day',
  weekly: 'week',
  monthly: 'month',
};

const STEP_TO_DATE_FORMAT: Record<Step, (date: moment.Moment | string) => string> = {
  hourly: (date) => moment(date).format('YYYY-MM-DD HH:00'),
  daily: (date) => moment(date).format('YYYY-MM-DD'),
  weekly(date) {
    const firstWeekDay = moment(date).isoWeekday(1).format('YYYY-MM-DD');
    const lastWeekDay = moment(date).isoWeekday(7).format('YYYY-MM-DD');

    return `${firstWeekDay} - ${lastWeekDay}`;
  },
  monthly: (date) => moment(date).format('YYYY-MM'),
};

const determineInitialStep = (oldestVisitDate: string): Step => {
  const now = moment();
  const oldestDate = moment(oldestVisitDate);
  const matcher = cond<never, Step | undefined>([
    [ () => now.diff(oldestDate, 'day') <= 2, always<Step>('hourly') ], // Less than 2 days
    [ () => now.diff(oldestDate, 'month') <= 1, always<Step>('daily') ], // Between 2 days and 1 month
    [ () => now.diff(oldestDate, 'month') <= 6, always<Step>('weekly') ], // Between 1 and 6 months
  ]);

  return matcher() ?? 'monthly';
};

const groupVisitsByStep = (step: Step, visits: (Visit | NormalizedVisit)[]): Stats => visits.reduce<Stats>(
  (acc, visit) => {
    const key = STEP_TO_DATE_FORMAT[step](visit.date);

    acc[key] = acc[key] ? acc[key] + 1 : 1;

    return acc;
  },
  {},
);

const generateLabels = (step: Step, visits: Visit[]): string[] => {
  const unit = STEP_TO_DATE_UNIT_MAP[step];
  const formatter = STEP_TO_DATE_FORMAT[step];
  const newerDate = moment(visits[0].date);
  const oldestDate = moment(visits[visits.length - 1].date);
  const size = newerDate.diff(oldestDate, unit);

  return [
    formatter(oldestDate),
    ...rangeOf(size, () => formatter(oldestDate.add(1, unit))),
  ];
};

const generateLabelsAndGroupedVisits = (
  visits: Visit[],
  groupedVisitsWithGaps: Stats,
  step: Step,
  skipNoElements: boolean,
): [string[], number[]] => {
  if (skipNoElements) {
    return [ Object.keys(groupedVisitsWithGaps), Object.values(groupedVisitsWithGaps) ];
  }

  const labels = generateLabels(step, visits);

  return [ labels, fillTheGaps(groupedVisitsWithGaps, labels) ];
};

const generateDataset = (data: number[], label: string, color: string): ChartDataSets => ({
  label,
  data,
  fill: false,
  lineTension: 0.2,
  borderColor: color,
  backgroundColor: color,
});

const LineChartCard = ({ title, visits, highlightedVisits, highlightedLabel = 'Selected' }: LineChartCardProps) => {
  const [ step, setStep ] = useState<Step>(
    visits.length > 0 ? determineInitialStep(visits[visits.length - 1].date) : 'monthly',
  );
  const [ skipNoVisits, toggleSkipNoVisits ] = useToggle(true);

  const groupedVisitsWithGaps = useMemo(() => groupVisitsByStep(step, reverse(visits)), [ step, visits ]);
  const [ labels, groupedVisits ] = useMemo(
    () => generateLabelsAndGroupedVisits(visits, groupedVisitsWithGaps, step, skipNoVisits),
    [ visits, step, skipNoVisits ],
  );
  const groupedHighlighted = useMemo(
    () => fillTheGaps(groupVisitsByStep(step, reverse(highlightedVisits)), labels),
    [ highlightedVisits, step, labels ],
  );

  const data: ChartData = {
    labels,
    datasets: [
      generateDataset(groupedVisits, 'Visits', '#4696e5'),
      highlightedVisits.length > 0 && generateDataset(groupedHighlighted, highlightedLabel, '#F77F28'),
    ].filter(Boolean) as ChartDataSets[],
  };
  const options = {
    maintainAspectRatio: false,
    legend: { display: false },
    scales: {
      yAxes: [
        {
          ticks: { beginAtZero: true, precision: 0 },
        },
      ],
      xAxes: [
        {
          scaleLabel: { display: true, labelString: STEPS_MAP[step] },
        },
      ],
    },
    tooltips: {
      intersect: false,
      axis: 'x',
    },
  };

  return (
    <Card>
      <CardHeader>
        {title}
        <div className="float-right">
          <UncontrolledDropdown>
            <DropdownToggle caret color="link" className="btn-sm p-0">
              Group by
            </DropdownToggle>
            <DropdownMenu right>
              {Object.entries(STEPS_MAP).map(([ value, menuText ]) => (
                <DropdownItem key={value} active={step === value} onClick={() => setStep(value as Step)}>
                  {menuText}
                </DropdownItem>
              ))}
            </DropdownMenu>
          </UncontrolledDropdown>
        </div>
        <div className="float-right mr-2">
          <ToggleSwitch checked={skipNoVisits} onChange={toggleSkipNoVisits}>
            <small>Skip dates with no visits</small>
          </ToggleSwitch>
        </div>
      </CardHeader>
      <CardBody className="line-chart-card__body">
        <Line data={data} options={options} />
      </CardBody>
    </Card>
  );
};

export default LineChartCard;
