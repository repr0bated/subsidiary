import Card from './Card.svelte';
import Stack from './Stack.svelte';
import Grid from './Grid.svelte';
import Heading from './Heading.svelte';
import Text from './Text.svelte';
import Badge from './Badge.svelte';
import Alert from './Alert.svelte';
import Button from './Button.svelte';
import Separator from './Separator.svelte';
import Table from './Table.svelte';
import Progress from './Progress.svelte';
import Spinner from './Spinner.svelte';

/** Lichtenstein-styled implementations of sealed catalog components, by sealed name.
 * A sealed component with no implementation here is not drawn; the remaining 24 are next. */
export const comicComponents = { Card, Stack, Grid, Heading, Text, Badge, Alert, Button, Separator, Table, Progress, Spinner };
export type ImplementedComponent = keyof typeof comicComponents;
