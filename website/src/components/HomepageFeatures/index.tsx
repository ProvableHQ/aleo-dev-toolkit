import type { ReactNode } from 'react';
import clsx from 'clsx';
import Heading from '@theme/Heading';
import styles from './styles.module.css';
import MountainSvg from '@site/static/img/undraw_docusaurus_mountain.svg';
import TreeSvg from '@site/static/img/undraw_docusaurus_tree.svg';
import ReactSvg from '@site/static/img/undraw_docusaurus_react.svg';

type FeatureItem = {
  title: string;
  Svg: React.ComponentType<React.ComponentProps<'svg'>>;
  description: ReactNode;
};

const FeatureList: FeatureItem[] = [
  {
    title: 'Unified Interface',
    Svg: MountainSvg,
    description: (
      <>
        A simple and unified interface for integrating multiple Aleo wallets into your React
        applications with a single API.
      </>
    ),
  },
  {
    title: 'Multiple Wallets',
    Svg: TreeSvg,
    description: (
      <>
        Support for Shield, Leo, Puzzle, Fox, and Soter wallets. Easy to add more wallet adapters as
        they become available.
      </>
    ),
  },
  {
    title: 'React Hooks',
    Svg: ReactSvg,
    description: (
      <>
        Built with React hooks for easy integration. Use the <code>useWallet</code> hook to access
        wallet state and methods throughout your application.
      </>
    ),
  },
];

function Feature({ title, Svg, description }: FeatureItem) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center">
        <Svg className={styles.featureSvg} role="img" />
      </div>
      <div className="text--center padding-horiz--md">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): ReactNode {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
