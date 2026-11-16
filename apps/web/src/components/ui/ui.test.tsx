import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Badge } from './badge';
import { Button } from './button';
import { EmptyState } from './empty-state';
import { Field } from './field';
import { Select } from './select';
import { Skeleton } from './skeleton';

describe('Button', () => {
  it('renders a non-submitting button by default', () => {
    const html = renderToStaticMarkup(<Button>সংরক্ষণ</Button>);
    expect(html).toContain('<button');
    expect(html).toContain('type="button"');
    expect(html).toContain('সংরক্ষণ');
  });

  it('passes the disabled state through', () => {
    const html = renderToStaticMarkup(<Button disabled>সংরক্ষণ</Button>);
    expect(html).toContain('disabled');
  });
});

describe('Field', () => {
  it('ties the label, hint and error to the input', () => {
    const html = renderToStaticMarkup(
      <Field id="email" label="ইমেইল" hint="আপনার অ্যাকাউন্টের ইমেইল" error="ইমেইলটি ঠিক নেই" />,
    );

    expect(html).toContain('for="email"');
    expect(html).toContain('id="email"');
    expect(html).toContain('aria-describedby="email-hint email-error"');
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain('role="alert"');
  });

  it('leaves the error wiring out when there is no error', () => {
    const html = renderToStaticMarkup(<Field id="name" label="নাম" />);
    expect(html).not.toContain('aria-invalid');
    expect(html).not.toContain('role="alert"');
  });
});

describe('Select', () => {
  it('renders every option under a label', () => {
    const html = renderToStaticMarkup(
      <Select id="level" label="স্তর" options={[{ value: 'beginner', label: 'শুরুর' }, { value: 'advanced', label: 'উন্নত' }]} />,
    );

    expect(html).toContain('for="level"');
    expect(html).toContain('value="beginner"');
    expect(html).toContain('উন্নত');
  });
});

describe('Badge', () => {
  it('renders its text as content', () => {
    expect(renderToStaticMarkup(<Badge tone="success">প্রকাশিত</Badge>)).toContain('প্রকাশিত');
  });
});

describe('Skeleton', () => {
  it('stays out of the accessibility tree', () => {
    const html = renderToStaticMarkup(<Skeleton width="120px" height="12px" />);
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('width:120px');
  });
});

describe('EmptyState', () => {
  it('renders a heading, body and optional action', () => {
    const html = renderToStaticMarkup(<EmptyState title="কিছু নেই" body="পরে দেখুন" action={<Button>ঠিক আছে</Button>} />);
    expect(html).toContain('<h2');
    expect(html).toContain('কিছু নেই');
    expect(html).toContain('<button');
  });
});
